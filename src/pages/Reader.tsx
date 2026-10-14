
import {
  useEffect,
  useState,
} from "react";

import type { Document } from "../types/document";

interface ReaderProps {
  document: Document;
  onBack: () => void;
  onMarkAsRead: (id: string) => void;
}

function Reader({
  document: doc,
  onBack,
  onMarkAsRead,
}: ReaderProps) {
  const [fontSize, setFontSize] = useState(18);
  const [readingProgress, setReadingProgress] = useState(0);

  // 자료를 열면 읽음 상태로 변경
  useEffect(() => {
    onMarkAsRead(doc.id);
  }, [doc.id, onMarkAsRead]);

  // 저장된 읽기 위치 복원
  useEffect(() => {
    const resetReading = localStorage.getItem(
      `read-it-reset-${doc.id}`
    );

    if (resetReading === "true") {
      localStorage.setItem(
        `read-it-position-${doc.id}`,
        "0"
      );

      localStorage.setItem(
        `read-it-progress-${doc.id}`,
        "0"
      );

      localStorage.removeItem(
        `read-it-completed-${doc.id}`
      );

      localStorage.removeItem(
        `read-it-reset-${doc.id}`
      );

      setReadingProgress(0);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      });

      return;
    }

    const savedPosition = localStorage.getItem(
      `read-it-position-${doc.id}`
    );

    const savedProgress = localStorage.getItem(
      `read-it-progress-${doc.id}`
    );

    const completed = localStorage.getItem(
      `read-it-completed-${doc.id}`
    );

    if (completed === "true") {
      setReadingProgress(100);
    } else if (savedProgress !== null) {
      const progress = Number(savedProgress);

      setReadingProgress(
        Number.isFinite(progress)
          ? Math.min(100, Math.max(0, progress))
          : 0
      );
    } else {
      setReadingProgress(0);
    }

    requestAnimationFrame(() => {
      if (savedPosition !== null) {
        const position = Number(savedPosition);

        window.scrollTo({
          top: Number.isFinite(position)
            ? Math.max(0, position)
            : 0,
          behavior: "auto",
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      }
    });
  }, [doc.id]);

  // 스크롤 위치와 진행률 저장
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;

      const completed = localStorage.getItem(
        `read-it-completed-${doc.id}`
      );

      // 완료 상태는 새로고침해도 유지
      if (completed === "true") {
        setReadingProgress(100);

        localStorage.setItem(
          `read-it-progress-${doc.id}`,
          "100"
        );

        localStorage.setItem(
          `read-it-position-${doc.id}`,
          String(scrollTop)
        );

        return;
      }

      const documentHeight = Math.max(
        window.document.body.scrollHeight,
        window.document.documentElement.scrollHeight
      );

      const viewportHeight = window.innerHeight;

      const maxScroll = Math.max(
        0,
        documentHeight - viewportHeight
      );

      const progress =
        maxScroll > 0
          ? (scrollTop / maxScroll) * 100
          : 0;

      const roundedProgress = Math.min(
        100,
        Math.max(0, Math.round(progress))
      );

      setReadingProgress(roundedProgress);

      localStorage.setItem(
        `read-it-position-${doc.id}`,
        String(scrollTop)
      );

      localStorage.setItem(
        `read-it-progress-${doc.id}`,
        String(roundedProgress)
      );
    };

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [doc.id]);

  // 읽기 완료 처리
  const handleCompleteReading = () => {
    const documentHeight = Math.max(
      window.document.body.scrollHeight,
      window.document.documentElement.scrollHeight
    );

    const maxScroll = Math.max(
      0,
      documentHeight - window.innerHeight
    );

    localStorage.setItem(
      `read-it-position-${doc.id}`,
      String(maxScroll)
    );

    localStorage.setItem(
      `read-it-progress-${doc.id}`,
      "100"
    );

    // 완료 상태를 삭제하지 않고 유지
    localStorage.setItem(
      `read-it-completed-${doc.id}`,
      "true"
    );

    localStorage.removeItem(
      `read-it-reset-${doc.id}`
    );

    setReadingProgress(100);
    onMarkAsRead(doc.id);

    window.scrollTo({
      top: maxScroll,
      behavior: "smooth",
    });
  };

  // 처음부터 읽기
  const handleRestartReading = () => {
    localStorage.setItem(
      `read-it-position-${doc.id}`,
      "0"
    );

    localStorage.setItem(
      `read-it-progress-${doc.id}`,
      "0"
    );

    localStorage.removeItem(
      `read-it-completed-${doc.id}`
    );

    localStorage.setItem(
      `read-it-reset-${doc.id}`,
      "true"
    );

    setReadingProgress(0);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  };

  return (
    <main className="reader">
      <div className="reading-progress">
        <div className="reading-progress-info">
          <span>읽기 진행률</span>
          <span>{readingProgress}%</span>
        </div>

        <div className="reading-progress-track">
          <div
            className="reading-progress-fill"
            style={{
              width: `${readingProgress}%`,
            }}
          />
        </div>
      </div>

      <button
        className="back-button"
        onClick={onBack}
      >
        ← 자료실
      </button>

      <article className="reader-content">
        <div className="reader-meta">
          {doc.type === "file"
            ? "📄 파일"
            : doc.type === "web"
              ? "🌐 웹"
              : "✏️ 텍스트"}

          {" · "}
          읽음
          {" · "}
          {readingProgress}% 읽음
        </div>

        <h1>{doc.title}</h1>

        <div className="reader-toolbar">
          <button
            onClick={() =>
              setFontSize((size) =>
                Math.max(14, size - 1)
              )
            }
            aria-label="글자 크기 줄이기"
          >
            A−
          </button>

          <span>{fontSize}px</span>

          <button
            onClick={() =>
              setFontSize((size) =>
                Math.min(30, size + 1)
              )
            }
            aria-label="글자 크기 키우기"
          >
            A+
          </button>
        </div>

        <div className="reader-actions">
          <button onClick={handleCompleteReading}>
            읽기 완료
          </button>

          <button onClick={handleRestartReading}>
            처음부터 읽기
          </button>
        </div>

        <div
          className="reader-text"
          style={{ fontSize: `${fontSize}px` }}
        >
          {doc.content.split("\n").map(
            (paragraph, index) => (
              <p key={index}>
                {paragraph || "\u00A0"}
              </p>
            )
          )}
        </div>
      </article>
    </main>
  );
}

export default Reader;
