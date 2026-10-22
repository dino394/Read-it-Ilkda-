
import "dotenv/config";
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { Pool } from "pg";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./authMiddleware.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


const MAX_REDIRECTS = 5;
const MAX_HTML_SIZE = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 10000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(
          new Error(
            "허용되지 않은 CORS origin입니다."
          )
        );
      }
    },
  })
);
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "https://read-it-ilkda.netlify.app",
      "http://localhost:5173",
    ].filter(Boolean),
  })
);
app.use(express.json({ limit: "10kb" }));

// IPv4 사설 주소, 루프백, 링크 로컬, 예약된 주소 차단
function isBlockedIPv4(address) {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

// IPv6 주소의 주요 내부·특수 범위 차단
function isBlockedIPv6(address) {
  const ip = address.toLowerCase().split("%")[0];

  if (ip === "::" || ip === "::1") return true;

  // IPv4-mapped IPv6 주소도 검사
  const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) return isBlockedIPv4(mapped[1]);

  // IPv6를 16비트 블록으로 확장
  const halves = ip.split("::");

  if (halves.length > 2) return true;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;

  if (missing < 0 || (halves.length === 1 && missing !== 0)) {
    return true;
  }

  const groups = [
    ...left,
    ...Array(missing).fill("0"),
    ...right,
  ];

  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    return true;
  }

  const first = parseInt(groups[0], 16);
  const second = parseInt(groups[1], 16);

  return (
    (first & 0xfe00) === 0xfc00 || // Unique local
    (first & 0xffc0) === 0xfe80 || // Link local
    (first & 0xff00) === 0xff00 || // Multicast
    (first === 0x2001 && second === 0x0db8) || // 문서용 범위
    (first & 0xe000) !== 0x2000 // 글로벌 유니캐스트 이외
  );
}

function isBlockedIP(address) {
  const version = isIP(address);

  if (version === 4) return isBlockedIPv4(address);
  if (version === 6) return isBlockedIPv6(address);

  return true;
}

// URL과 DNS 결과 검증
async function validatePublicUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("올바른 URL이 아닙니다.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("http 또는 https 주소만 사용할 수 있습니다.");
  }

  if (url.username || url.password) {
    throw new Error("아이디나 비밀번호가 포함된 URL은 사용할 수 없습니다.");
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("로컬 또는 내부 네트워크 주소는 사용할 수 없습니다.");
  }

  const version = isIP(hostname);

  if (version) {
    if (isBlockedIP(hostname)) {
      throw new Error("내부 또는 예약된 IP 주소는 사용할 수 없습니다.");
    }

    return url;
  }

  let addresses;

  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("도메인 주소를 확인할 수 없습니다.");
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isBlockedIP(address))
  ) {
    throw new Error("내부 네트워크로 연결될 수 있는 주소는 차단됩니다.");
  }

  return url;
}

// 리디렉션을 자동으로 따라가지 않고, 이동할 주소를 매번 검증
async function fetchPublicHtml(initialUrl) {
  let currentUrl = initialUrl;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await validatePublicUrl(currentUrl.href);

    const response = await fetch(currentUrl.href, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReadIt/1.0)",
        Accept: "text/html",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("리디렉션 주소를 확인할 수 없습니다.");
      }

      await response.body?.cancel();

      currentUrl = new URL(location, currentUrl);

      if (i === MAX_REDIRECTS) {
        throw new Error("리디렉션 횟수가 너무 많습니다.");
      }

      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`웹페이지 요청에 실패했습니다. (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("text/html")) {
      await response.body?.cancel();
      throw new Error("HTML 웹페이지 주소만 가져올 수 있습니다.");
    }

    const declaredSize = Number(response.headers.get("content-length"));

    if (Number.isFinite(declaredSize) && declaredSize > MAX_HTML_SIZE) {
      await response.body?.cancel();
      throw new Error("웹페이지가 너무 큽니다. (최대 2MB)");
    }

    if (!response.body) {
      throw new Error("웹페이지 응답에 본문이 없습니다.");
    }

    const reader = response.body.getReader();
    const chunks = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalSize += value.byteLength;

        if (totalSize > MAX_HTML_SIZE) {
          await reader.cancel();
          throw new Error("웹페이지가 너무 큽니다. (최대 2MB)");
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const htmlBytes = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      htmlBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      html: new TextDecoder("utf-8").decode(htmlBytes),
      finalUrl: currentUrl.href,
    };
  }

  throw new Error("웹페이지를 가져오지 못했습니다.");
}

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL 연결 성공!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("PostgreSQL 연결 실패:", error);

    res.status(500).json({
      success: false,
      message: "PostgreSQL 연결에 실패했습니다.",
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "이메일을 입력해 주세요.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "비밀번호는 8자 이상이어야 합니다.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "이미 가입된 이메일입니다.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
      `,
      [normalizedEmail, passwordHash]
    );

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("회원가입 실패:", error);

    res.status(500).json({
      success: false,
      message: "회원가입 중 오류가 발생했습니다.",
    });
  }
});
console.log(
  "JWT_SECRET 확인:",
  process.env.JWT_SECRET ? "설정됨" : "설정되지 않음"
);
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 이메일 확인
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "이메일을 입력해 주세요.",
      });
    }

    // 2. 비밀번호 확인
    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "비밀번호를 입력해 주세요.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. 이메일로 사용자 찾기
    const result = await pool.query(
      `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const user = result.rows[0];

    // 4. 입력한 비밀번호와 DB의 암호화된 비밀번호 비교
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 5. 로그인 성공
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

        console.log("JWT 생성 성공");

        res.json({
          success: true,
          message: "로그인에 성공했습니다.",
          token: token,
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          },
        });
          } catch (error) {
            console.error("로그인 실패:", error);

            res.status(500).json({
              success: false,
              message: "로그인 중 오류가 발생했습니다.",
            });
          }
        });

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("사용자 조회 실패:", error);

    res.status(500).json({
      success: false,
      message: "사용자를 불러오지 못했습니다.",
    });
  }
});

app.post("/api/documents", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      url,
      is_read,
      is_favorite,
    } = req.body;

    // 필수 항목 확인
    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !["text", "file", "web"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "문서 제목, 내용, 유형을 확인해 주세요.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO documents (
        user_id,
        title,
        content,
        type,
        url,
        is_read,
        is_favorite
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        title,
        content,
        type,
        url,
        is_read,
        is_favorite,
        created_at,
        updated_at
      `,
      [
        req.user.userId,
        title.trim(),
        content,
        type,
        typeof url === "string" ? url : null,
        typeof is_read === "boolean" ? is_read : false,
        typeof is_favorite === "boolean" ? is_favorite : false,
      ]
    );

    res.status(201).json({
      success: true,
      message: "문서가 저장되었습니다.",
      document: result.rows[0],
    });
  } catch (error) {
    console.error("문서 저장 실패:", error);

    res.status(500).json({
      success: false,
      message: "문서를 저장하지 못했습니다.",
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "읽다 서버가 정상적으로 실행 중입니다.",
    health: "/api/health",
  });
});

app.post("/api/fetch", async (req, res) => {
  try {
    const { url } = req.body;

    if (typeof url !== "string" || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: "URL을 입력해 주세요.",
      });
    }

    const safeUrl = await validatePublicUrl(url.trim());
    const { html, finalUrl } = await fetchPublicHtml(safeUrl);

    const $ = cheerio.load(html);

    $(
      [
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        "button",
        "input",
        "[role='navigation']",
        "[role='banner']",
        "[role='contentinfo']",
        ".advertisement",
        ".advert",
        ".sidebar",
        ".cookie-banner",
        ".social-share",
      ].join(",")
    ).remove();

    const title =
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("meta[name='twitter:title']").attr("content")?.trim() ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      "제목 없는 웹페이지";

    const candidates = [
      $("article").first(),
      $("main").first(),
      $("[role='main']").first(),
      $(".post-content").first(),
      $(".article-content").first(),
      $(".entry-content").first(),
      $("body").first(),
    ];

    let content = "";

    for (const candidate of candidates) {
      if (!candidate.length) continue;

      const text = candidate
        .find("h1, h2, h3, p, li, blockquote, pre")
        .toArray()
        .map((element) => $(element).text().trim())
        .filter(Boolean)
        .join("\n\n");

      if (text.length > content.length) {
        content = text;
      }

      if (content.length >= 300) break;
    }

    const cleanedContent = content
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanedContent) {
      return res.status(422).json({
        success: false,
        message: "웹페이지 본문을 찾지 못했습니다.",
      });
    }

    res.json({
      success: true,
      url: finalUrl,
      title,
      content: cleanedContent,
    });
  } catch (error) {
    console.error("웹페이지 가져오기 실패:", error);

    const message =
      error instanceof Error
        ? error.message
        : "웹페이지를 가져오는 중 오류가 발생했습니다.";

    const status = /시간|timeout/i.test(message)
      ? 504
      : 400;

    res.status(status).json({
      success: false,
      message,
    });
  }
});
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, email, created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("사용자 정보 조회 실패:", error);

    res.status(500).json({
      success: false,
      message: "사용자 정보를 불러오지 못했습니다.",
    });
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`읽다 서버 실행: 포트 ${PORT}`);
});

app.get("/api/documents", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title,
        content,
        type,
        url,
        is_read,
        is_favorite,
        created_at,
        updated_at
      FROM documents
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.userId]
    );

    res.json({
      success: true,
      documents: result.rows,
    });
  } catch (error) {
    console.error("문서 조회 실패:", error);

    res.status(500).json({
      success: false,
      message: "문서를 불러오지 못했습니다.",
    });
  }
});


app.put("/api/documents/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      url,
      is_read,
      is_favorite,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !["text", "file", "web"].includes(type) ||
      (url !== undefined && url !== null && typeof url !== "string") ||
      (is_read !== undefined && typeof is_read !== "boolean") ||
      (is_favorite !== undefined && typeof is_favorite !== "boolean")
    ) {
      return res.status(400).json({
        success: false,
        message: "수정할 문서 정보를 확인해 주세요.",
      });
    }

    const result = await pool.query(
      `
      UPDATE documents
      SET
        title = $1,
        content = $2,
        type = $3,
        url = $4,
        is_read = $5,
        is_favorite = $6,
        updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING
        id,
        title,
        content,
        type,
        url,
        is_read,
        is_favorite,
        created_at,
        updated_at
      `,
      [
        title.trim(),
        content,
        type,
        url ?? null,
        is_read ?? false,
        is_favorite ?? false,
        id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "문서를 찾을 수 없거나 수정 권한이 없습니다.",
      });
    }

    res.json({
      success: true,
      message: "문서가 수정되었습니다.",
      document: result.rows[0],
    });
  } catch (error) {
    console.error("문서 수정 실패:", error);

    res.status(500).json({
      success: false,
      message: "문서를 수정하지 못했습니다.",
    });
  }
});


app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM documents
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "문서를 찾을 수 없거나 삭제 권한이 없습니다.",
      });
    }

    res.json({
      success: true,
      message: "문서가 삭제되었습니다.",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("문서 삭제 실패:", error);

    res.status(500).json({
      success: false,
      message: "문서를 삭제하지 못했습니다.",
    });
  }
});

app.get(
  "/api/documents/:id/progress",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          rp.position,
          rp.progress,
          rp.completed,
          rp.updated_at
        FROM reading_progress rp
        JOIN documents d
          ON d.id = rp.document_id
        WHERE d.id = $1
          AND d.user_id = $2
        `,
        [id, req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          progress: {
            position: 0,
            progress: 0,
            completed: false,
          },
        });
      }

      res.json({
        success: true,
        progress: result.rows[0],
      });
    } catch (error) {
      console.error("독서 진행률 조회 실패:", error);

      res.status(500).json({
        success: false,
        message: "독서 진행률을 불러오지 못했습니다.",
      });
    }
  }
);

app.put(
  "/api/documents/:id/progress",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { position, progress, completed } = req.body;

      if (
        typeof position !== "number" ||
        !Number.isFinite(position) ||
        position < 0 ||
        typeof progress !== "number" ||
        !Number.isInteger(progress) ||
        progress < 0 ||
        progress > 100 ||
        typeof completed !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: "독서 진행률 정보를 확인해 주세요.",
        });
      }

      // 해당 문서가 현재 로그인한 사용자의 것인지 확인
      const documentResult = await pool.query(
        `
        SELECT id
        FROM documents
        WHERE id = $1 AND user_id = $2
        `,
        [id, req.user.userId]
      );

      if (documentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "문서를 찾을 수 없거나 접근 권한이 없습니다.",
        });
      }

      // 기존 진행률이 있으면 갱신하고, 없으면 새로 저장
      const result = await pool.query(
        `
        INSERT INTO reading_progress (
          document_id,
          position,
          progress,
          completed,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (document_id)
        DO UPDATE SET
          position = EXCLUDED.position,
          progress = EXCLUDED.progress,
          completed = EXCLUDED.completed,
          updated_at = NOW()
        RETURNING
          document_id,
          position,
          progress,
          completed,
          updated_at
        `,
        [id, position, progress, completed]
      );

      res.json({
        success: true,
        message: "독서 진행률이 저장되었습니다.",
        progress: result.rows[0],
      });
    } catch (error) {
      console.error("독서 진행률 저장 실패:", error);

      res.status(500).json({
        success: false,
        message: "독서 진행률을 저장하지 못했습니다.",
      });
    }
  }
);

