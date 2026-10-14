
interface EmptyStateProps {
  message?: string;
}

function EmptyState({
  message = "아직 저장한 자료가 없습니다. 텍스트나 웹페이지를 추가해 보세요.",
}: EmptyStateProps) {
  const isSearchEmpty = message.includes("검색");

  return (
    <div className="empty-state">
      <div className="empty-icon">
        {isSearchEmpty ? "🔎" : "📚"}
      </div>

      <p>{message}</p>

      {!isSearchEmpty && (
        <p className="empty-state-hint">
          마음에 드는 글을 저장하면 이곳에서 다시 읽을 수 있어요.
        </p>
      )}
    </div>
  );
}

export default EmptyState;