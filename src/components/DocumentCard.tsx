import type { Document } from "../types/document";
import "./DocumentCard.css";

interface DocumentCardProps {
document: Document;
onClick: () => void;
onDelete: () => void;
onToggleFavorite: () => void;
onEdit: () => void;

// 여러 자료 선택 기능
selectionMode?: boolean;
isSelected?: boolean;
onToggleSelect?: () => void;
}

function DocumentCard({
document,
onClick,
onDelete,
onToggleFavorite,
onEdit,
selectionMode = false,
isSelected = false,
onToggleSelect,
}: DocumentCardProps) {
const handleDelete = (
event: React.MouseEvent<HTMLButtonElement>
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
event: React.MouseEvent<HTMLButtonElement>
) => {
event.stopPropagation();
onToggleFavorite();
};

const handleEdit = (
event: React.MouseEvent<HTMLButtonElement>
) => {
event.stopPropagation();
onEdit();
};

const handleSelect = (
event: React.ChangeEvent<HTMLInputElement>
) => {
event.stopPropagation();
onToggleSelect?.();
};

const formattedDate = new Date(
document.createdAt
).toLocaleDateString("ko-KR", {
year: "numeric",
month: "long",
day: "numeric",
});

const savedProgress = Number(
localStorage.getItem(
`read-it-progress-${document.id}`
) ?? 0
);

const readingProgress = Math.min(
100,
Math.max(
0,
Number.isFinite(savedProgress)
? savedProgress
: 0
)
);

const readingStatus =
readingProgress === 0
? "읽지 않음"
: readingProgress >= 100
? "완독"
: "읽는 중";

const handleCardClick = () => {
if (selectionMode) {
onToggleSelect?.();
return;
}


onClick();


};

return (
<article
className={`document-card ${
        document.isRead ? "is-read" : ""
      } ${selectionMode ? "selection-mode" : ""} ${
        isSelected ? "is-selected" : ""
      }`}
onClick={handleCardClick}
> <div className="document-card-top"> <div className="document-card-type-area">
{selectionMode && (
<input
type="checkbox"
className="document-select-checkbox"
checked={isSelected}
onChange={handleSelect}
onClick={(event) => event.stopPropagation()}
aria-label={`${document.title} 선택`}
/>
)}


      <span
        className={`document-type document-type-${document.type}`}
      >
        {document.type === "file"
          ? "📄 파일"
          : document.type === "web"
          ? "🌐 웹"
          : "✏️ 텍스트"}
      </span>
    </div>

    {!selectionMode && (
      <div className="document-card-actions">
        <button
          className={`favorite-button ${
            document.isFavorite ? "is-favorite" : ""
          }`}
          onClick={handleFavorite}
          aria-label={
            document.isFavorite
              ? "즐겨찾기 해제"
              : "즐겨찾기 추가"
          }
          title="즐겨찾기"
        >
          {document.isFavorite ? "★" : "☆"}
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
    )}
  </div>

  <h3 className="document-card-title">
    {document.title}
  </h3>

  <p className="document-card-preview">
    {document.content.length > 100
      ? `${document.content.slice(0, 100)}...`
      : document.content}
  </p>

  <div className="document-card-bottom">
    <span
      className={`reading-status reading-status-${
        readingProgress === 0
          ? "unread"
          : readingProgress >= 100
          ? "completed"
          : "reading"
      }`}
    >
      {readingStatus}
    </span>

    <span className="document-card-date">
      {formattedDate}
    </span>
  </div>

  <div className="document-reading-progress">
    <div className="document-reading-progress-info">
      <span>읽기 진행률</span>
      <span>{readingProgress}%</span>
    </div>

    <div className="document-reading-progress-track">
      <div
        className="document-reading-progress-fill"
        style={{
          width: `${readingProgress}%`,
        }}
      />
    </div>
  </div>
</article>


);
}

export default DocumentCard;
