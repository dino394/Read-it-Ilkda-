
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const allowedOrigin = process.env.FRONTEND_URL;


const MAX_REDIRECTS = 5;
const MAX_HTML_SIZE = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 10000;


const allowedOrigin = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: allowedOrigin,
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`읽다 서버 실행: 포트 ${PORT}`);
});