
import { useState } from "react";
import "./AddUrlPanel.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface AddUrlPanelProps {
  onAddUrl: (url: string, title: string, content: string) => void;
}

interface FetchResult {
  success: boolean;
  message?: string;
  title?: string;
  content?: string;
}

function AddUrlPanel({ onAddUrl }: AddUrlPanelProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedUrl = url.trim();
    setErrorMessage("");

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setErrorMessage("올바른 웹페이지 주소를 입력해 주세요.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setErrorMessage("http 또는 https 주소만 사용할 수 있습니다.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/fetch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: parsedUrl.href }),
        signal: AbortSignal.timeout(15000),
      });

      const data: FetchResult = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.message || `요청에 실패했습니다. (${response.status})`
        );
        return;
      }

      if (!data.title?.trim() || !data.content?.trim()) {
        setErrorMessage("웹페이지에서 제목이나 본문을 찾지 못했습니다.");
        return;
      }

      onAddUrl(parsedUrl.href, data.title, data.content);
      setUrl("");
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        setErrorMessage("응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setErrorMessage(
          "서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요."
        );
      }

      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="add-url-panel">
      <div className="add-url-heading">
        <h2>웹페이지 가져오기</h2>
        <p>저장하고 싶은 웹페이지의 주소를 입력하세요.</p>
      </div>

      <form className="add-url-form" onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setErrorMessage("");
          }}
          placeholder="https://example.com/article"
          aria-label="웹페이지 주소"
          disabled={loading}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "가져오는 중..." : "가져오기"}
        </button>
      </form>

      {errorMessage && (
        <p className="add-url-error" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="add-url-help">
        웹페이지의 제목과 본문을 추출해 자료실에 저장합니다.
      </p>
    </section>
  );
}

export default AddUrlPanel;