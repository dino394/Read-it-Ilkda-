
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
  document,
  onBack,
  onMarkAsRead,
}: ReaderProps) {
  const [fontSize, setFontSize] =
    useState(18);

  // 글을 열면 읽음 상태로 변경
  useEffect(() => {
    onMarkAsRead(document.id);
  }, [document.id, onMarkAsRead]);

  // 저장된 읽기 위치 복원
  useEffect(() => {
    const savedPosition =
      localStorage.getItem(
        `read-it-position-${document.id}`
      );

    const position = Number(savedPosition);

    if (savedPosition !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: position,
          behavior: "auto",
        });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [document.id]);

  // 현재 스크롤 위치 저장
  useEffect(() => {
    const handleScroll = () => {
      localStorage.setItem(
        `read-it-position-${document.id}`,
        String(window.scrollY)
      );
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [document.id]);

  return (
    <main className="reader">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← 자료실
      </button>

      <article className="reader-content">
        <div className="reader-meta">
          {document.type === "file"
            ? "📄 파일"
            : document.type === "web"
            ? "🌐 웹"
            : "✏️ 텍스트"}

          {" · "}
          읽음
        </div>

        <h1>{document.title}</h1>

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

        <div
          className="reader-text"
          style={{
            fontSize: `${fontSize}px`,
          }}
        >
          {document.content
            .split("\n")
            .map((paragraph, index) => (
              <p key={index}>
                {paragraph || "\u00A0"}
              </p>
            ))}
        </div>
      </article>
    </main>
  );
}

export default Reader;

