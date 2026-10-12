
import { useMemo, useRef, useState } from "react";

import type { Document } from "../types/document";

import SearchBar from "../components/SearchBar";
import ImportPanel from "../components/ImportPanel";
import DocumentCard from "../components/DocumentCard";
import EmptyState from "../components/EmptyState";
import AddTextModal from "../components/AddTextModal";
import AddUrlPanel from "../components/AddUrlPanel";

interface HomeProps {
  documents: Document[];
  onSelectDocument: (id: string) => void;
  onAddText: (title: string, content: string) => void;
  onAddFile: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onDeleteDocument: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEditDocument: (
    id: string,
    title: string,
    content: string
  ) => void;
  onExportBackup: () => void;
  onImportBackup: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onAddUrl: (url: string, title: string, content: string) => void;
}

type FilterType = "all" | "unread" | "favorite";
type SortType = "latest" | "oldest" | "title";

function Home({
  documents,
  onSelectDocument,
  onAddText,
  onAddFile,
  onDeleteDocument,
  onToggleFavorite,
  onEditDocument,
  onExportBackup,
  onImportBackup,
  onAddUrl,
}: HomeProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("all");
  const [sort, setSort] =
    useState<SortType>("latest");
  const [showTextModal, setShowTextModal] =
    useState(false);
  const [editingDocument, setEditingDocument] =
    useState<Document | null>(null);

  const backupInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = documents.filter((document) => {
      const matchesSearch =
        !keyword ||
        document.title.toLowerCase().includes(keyword) ||
        document.content.toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "unread"
          ? !document.isRead
          : document.isFavorite;

      return matchesSearch && matchesFilter;
    });

    return [...result].sort((a, b) => {
      if (sort === "latest") {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }

      if (sort === "oldest") {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }

      return a.title.localeCompare(b.title, "ko");
    });
  }, [documents, search, filter, sort]);

  const handleSaveText = (
    title: string,
    content: string
  ) => {
    onAddText(title, content);
    setShowTextModal(false);
  };

  const handleSaveEdit = (
    title: string,
    content: string
  ) => {
    if (!editingDocument) {
      return;
    }

    onEditDocument(
      editingDocument.id,
      title,
      content
    );

    setEditingDocument(null);
  };

  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">MY READING SPACE</p>

        <h1>
          인터넷의 정보를
          <br />
          저장하고 다시 읽는 공간
        </h1>

        <p className="hero-description">
          글과 파일을 한곳에 모아
          <br />
          내 방식으로 읽어보세요.
        </p>
      </section>

      <SearchBar
        value={search}
        onChange={setSearch}
      />

      <ImportPanel
        
        onAddText={() => setShowTextModal(true)}
        onAddFile={onAddFile}
      />
      <AddUrlPanel onAddUrl={onAddUrl} />

      <div className="filter-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          전체
        </button>

        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          읽지 않음
        </button>

        <button
          className={filter === "favorite" ? "active" : ""}
          onClick={() => setFilter("favorite")}
        >
          즐겨찾기
        </button>
      </div>

      <section className="documents-section">
        <div className="section-header">
          <h2>최근 자료</h2>

          <div className="section-controls">
            <span>{filteredDocuments.length}</span>

            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortType)
              }
              aria-label="자료 정렬"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="title">제목순</option>
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <EmptyState
            message={
              search
                ? "검색 결과가 없습니다."
                : filter === "unread"
                ? "읽지 않은 자료가 없습니다."
                : filter === "favorite"
                ? "즐겨찾기한 자료가 없습니다."
                : "아직 저장된 자료가 없습니다."
            }
          />
        ) : (
          <div className="document-list">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onClick={() =>
                  onSelectDocument(document.id)
                }
                onDelete={() =>
                  onDeleteDocument(document.id)
                }
                onToggleFavorite={() =>
                  onToggleFavorite(document.id)
                }
                onEdit={() =>
                  setEditingDocument(document)
                }
              />
            ))}
          </div>
        )}
      </section>

      <div className="backup-section">
        <div className="backup-actions">
          <button
            type="button"
            className="backup-button"
            onClick={onExportBackup}
          >
            JSON 백업 다운로드
          </button>

          <button
            type="button"
            className="backup-button"
            onClick={() => backupInputRef.current?.click()}
          >
            백업 파일 복원
          </button>

          <input
            ref={backupInputRef}
            className="backup-file-input"
            type="file"
            accept=".json,application/json"
            onChange={onImportBackup}
            aria-label="JSON 백업 파일 선택"
          />
        </div>

        <p>
          백업 파일을 안전하게 보관하고 필요할 때 복원하세요.
        </p>
      </div>

      {showTextModal && (
        <AddTextModal
          onClose={() => setShowTextModal(false)}
          onSave={handleSaveText}
        />
      )}

      {editingDocument && (
        <AddTextModal
          key={editingDocument.id}
          mode="edit"
          initialTitle={editingDocument.title}
          initialContent={editingDocument.content}
          onClose={() => setEditingDocument(null)}
          onSave={handleSaveEdit}
        />
      )}
    </main>
  );
}

export default Home;