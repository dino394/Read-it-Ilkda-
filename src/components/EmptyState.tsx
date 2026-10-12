interface EmptyStateProps {
  message?: string;
}

function EmptyState({
  message = "아직 저장된 자료가 없습니다.",
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📚</div>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;