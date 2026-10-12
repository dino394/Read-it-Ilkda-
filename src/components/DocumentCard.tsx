
import type { Document } from "../types/document";

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
}

function DocumentCard({
  document,
  onClick,
  onDelete,
  onToggleFavorite,
  onEdit,
}: DocumentCardProps) {
  const handleDelete = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `"${document.title}" 자료를 삭제할까요?`
    );

    if (confirmed) {
      onDelete();
    }
  };

  const handleFavorite = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    onToggleFavorite();
  };

  const handleEdit = (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    onEdit();
  };

  const formattedDate = new Date(
    document.createdAt
  ).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article
      className={`document-card ${
        document.isRead ? "is-read" : ""
      }`}
      onClick={onClick}
    >
      <div className="document-card-top">
        <span className="document-type">
          {document.type === "file"
            ? "📄 파일"
            : document.type === "web"
            ? "🌐 웹"
            : "✏️ 텍스트"}
        </span>

        <div className="document-card-actions">
          <button
            className={`favorite-button ${
              document.isFavorite
                ? "is-favorite"
                : ""
            }`}
            onClick={handleFavorite}
            aria-label={
              document.isFavorite
                ? "즐겨찾기 해제"
                : "즐겨찾기 추가"
            }
          >
            {document.isFavorite
              ? "★"
              : "☆"}
          </button>

          <button
            className="edit-button"
            onClick={handleEdit}
            aria-label="자료 수정"
            title="수정"
          >
            ✎
          </button>

          <button
            className="delete-button"
            onClick={handleDelete}
            aria-label="자료 삭제"
            title="삭제"
          >
            ⋯
          </button>
        </div>
      </div>

      <h3>{document.title}</h3>

      <p>
        {document.content.length > 100
          ? `${document.content.slice(0, 100)}...`
          : document.content}
      </p>

      <div className="document-card-bottom">
        <span>
          {document.isRead
            ? "읽음"
            : "읽지 않음"}
        </span>

        <span>{formattedDate}</span>
      </div>
    </article>
  );
}

export default DocumentCard;

