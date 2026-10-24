import "./ImportPanel.css";

interface ImportPanelProps {
  onAddText: () => void;
  onAddFile: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

function ImportPanel({
  onAddText,
  onAddFile,
}: ImportPanelProps) {
  return (
    <div className="import-panel">
      <button
        className="primary-button"
        onClick={onAddText}
      >
        + 텍스트 추가
      </button>

      <label className="secondary-button">
        📁 파일 추가

        <input
          type="file"
          accept=".txt,.md"
          onChange={onAddFile}
          hidden
        />
      </label>
    </div>
  );
}

export default ImportPanel;