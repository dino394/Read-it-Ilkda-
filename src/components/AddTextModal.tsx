
import { useState } from "react";

interface AddTextModalProps {
  onClose: () => void;
  onSave: (
    title: string,
    content: string
  ) => void;
  initialTitle?: string;
  initialContent?: string;
  mode?: "add" | "edit";
}

function AddTextModal({
  onClose,
  onSave,
  initialTitle = "",
  initialContent = "",
  mode = "add",
}: AddTextModalProps) {
  const [title, setTitle] =
    useState(initialTitle);

  const [content, setContent] =
    useState(initialContent);

  const handleSave = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("본문을 입력해주세요.");
      return;
    }

    onSave(
      title.trim(),
      content.trim()
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="text-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <h2>
            {mode === "edit"
              ? "자료 수정"
              : "텍스트 추가"}
          </h2>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="document-title">
            제목
          </label>

          <input
            id="document-title"
            type="text"
            placeholder="글 제목을 입력하세요"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="document-content">
            본문
          </label>

          <textarea
            id="document-content"
            placeholder="글을 붙여넣거나 직접 입력하세요"
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
          />
        </div>

        <div className="modal-actions">
          <button
            className="cancel-button"
            onClick={onClose}
          >
            취소
          </button>

          <button
            className="save-button"
            onClick={handleSave}
          >
            {mode === "edit"
              ? "수정 완료"
              : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTextModal;
