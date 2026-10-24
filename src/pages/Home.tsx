
import { useMemo, useRef, useState } from "react";

import type { Document } from "../types/document";

import SearchBar from "../components/SearchBar";
import ImportPanel from "../components/ImportPanel";
import DocumentCard from "../components/DocumentCard";
import EmptyState from "../components/EmptyState";
import AddTextModal from "../components/AddTextModal";
import AddUrlPanel from "../components/AddUrlPanel";
import "../components/DocumentCard.css";

interface HomeProps {
  documents: Document[];
  onDeleteMultipleDocuments: (ids: string[]) => void;
  onSelectDocument: (id: string) => void;
  onAddText: (title: string, content: string) => void;
  onAddFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteDocument: (id: string) => void;
  onDeleteAllDocuments: () => void;
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
  onAddUrl: (
    url: string,
    title: string,
    content: string
  ) => void;
}

type FilterType = "all" | "unread" | "favorite";
type SortType = "latest" | "oldest" | "title";
type TypeFilter = "all" | "text" | "file" | "web";
type ReadingFilter = "all" | "unread" | "reading" | "completed";

function Home({
  documents,
  onSelectDocument,
  onAddText,
  onAddFile,
  onDeleteDocument,
  onDeleteAllDocuments,
  onToggleFavorite,
  onEditDocument,
  onExportBackup,
  onImportBackup,
  onAddUrl,
  onDeleteMultipleDocuments,
}: HomeProps) {
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] =
    useState<string[]>([]);
  const [readingFilter, setReadingFilter] =
    useState<ReadingFilter>("all");
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("all");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("latest");
  const [showTextModal, setShowTextModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<Document | null>(null);

  const backupInputRef = useRef<HTMLInputElement>(null);

  // 검색, 필터, 정렬
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

      const savedProgress = Number(
        localStorage.getItem(
          `read-it-progress-${document.id}`
        ) ?? 0
      );

      const progress = Number.isFinite(savedProgress)
        ? Math.min(100, Math.max(0, savedProgress))
        : 0;

      const matchesReadingFilter =
        readingFilter === "all"
          ? true
          : readingFilter === "unread"
            ? progress === 0
            : readingFilter === "reading"
              ? progress > 0 && progress < 100
              : progress >= 100;

      const matchesTypeFilter =
        typeFilter === "all" ||
        document.type === typeFilter;

      return (
        matchesSearch &&
        matchesFilter &&
        matchesReadingFilter &&
        matchesTypeFilter
      );
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
  }, [
    documents,
    search,
    filter,
    sort,
    readingFilter,
    typeFilter,
  ]);

  // 개별 선택 및 해제
  const handleToggleSelect = (id: string) => {
    setSelectedDocumentIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id]
    );
  };

  // 현재 표시된 자료 전체 선택 및 해제
  const handleToggleSelectAll = () => {
    const visibleIds = filteredDocuments.map(
      (document) => document.id
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedDocumentIds.includes(id)
      );

    if (allSelected) {
      setSelectedDocumentIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedDocumentIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  // 선택한 자료 일괄 삭제
  const handleDeleteSelected = () => {
    const idsToDelete = selectedDocumentIds.filter((id) =>
      documents.some((document) => document.id === id)
    );

    if (idsToDelete.length === 0) {
      window.alert("삭제할 자료를 선택해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      `선택한 자료 ${idsToDelete.length}개를 삭제할까요?\n\n` +
        "삭제한 자료와 읽기 진행률은 복구할 수 없습니다."
    );

    if (!confirmed) return;

    onDeleteMultipleDocuments(idsToDelete);
    setSelectedDocumentIds([]);
    setSelectionMode(false);
  };

  // 선택한 자료 일괄 즐겨찾기 추가 및 해제
  const handleBulkFavorite = (isFavorite: boolean) => {
    const selectedDocuments = documents.filter((document) =>
      selectedDocumentIds.includes(document.id)
    );

    if (selectedDocuments.length === 0) {
      window.alert("먼저 자료를 선택해 주세요.");
      return;
    }

    const documentsToUpdate = selectedDocuments.filter(
      (document) => document.isFavorite !== isFavorite
    );

    if (documentsToUpdate.length === 0) {
      window.alert(
        isFavorite
          ? "선택한 자료가 이미 모두 즐겨찾기에 추가되어 있습니다."
          : "선택한 자료가 이미 모두 즐겨찾기 해제 상태입니다."
      );
      return;
    }

    documentsToUpdate.forEach((document) => {
      onToggleFavorite(document.id);
    });

    window.alert(
      isFavorite
        ? `${documentsToUpdate.length}개 자료를 즐겨찾기에 추가했습니다.`
        : `${documentsToUpdate.length}개 자료를 즐겨찾기에서 해제했습니다.`
    );
  };

  // 선택 모드 종료
  const handleCancelSelection = () => {
    setSelectedDocumentIds([]);
    setSelectionMode(false);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearch("");
    setFilter("all");
    setReadingFilter("all");
    setTypeFilter("all");
    setSort("latest");
  };

  // 텍스트 자료 저장
  const handleSaveText = (
    title: string,
    content: string
  ) => {
    onAddText(title, content);
    setShowTextModal(false);
  };

  // 자료 수정 저장
  const handleSaveEdit = (
    title: string,
    content: string
  ) => {
    if (!editingDocument) return;

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

      <SearchBar value={search} onChange={setSearch} />

      <ImportPanel
        onAddText={() => setShowTextModal(true)}
        onAddFile={onAddFile}
      />

      <AddUrlPanel onAddUrl={onAddUrl} />

      <p className="filter-label">읽기 상태</p>

      <div className="reading-filter">
        {(
          [
            ["all", "전체"],
            ["unread", "읽지 않음"],
            ["reading", "읽는 중"],
            ["completed", "완독"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={readingFilter === value ? "active" : ""}
            onClick={() => setReadingFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="filter-label">자료 유형</p>

      <div className="reading-filter">
        {(
          [
            ["all", "전체"],
            ["text", "텍스트"],
            ["file", "파일"],
            ["web", "웹"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={typeFilter === value ? "active" : ""}
            onClick={() => setTypeFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="filter-reset-button"
        onClick={handleResetFilters}
      >
        필터 초기화
      </button>

      <section className="documents-section">
        <div className="bulk-actions">
          {!selectionMode ? (
            <button
              type="button"
              className="bulk-action-button"
              onClick={() => setSelectionMode(true)}
              disabled={filteredDocuments.length === 0}
            >
              여러 자료 선택
            </button>
          ) : (
            <>
              <span className="bulk-selection-count">
                {selectedDocumentIds.length}개 선택됨
              </span>

              <button
                type="button"
                className="bulk-action-button"
                onClick={handleToggleSelectAll}
                disabled={filteredDocuments.length === 0}
              >
                {filteredDocuments.length > 0 &&
                filteredDocuments.every((document) =>
                  selectedDocumentIds.includes(document.id)
                )
                  ? "전체 선택 해제"
                  : "전체 선택"}
              </button>

              <button
                type="button"
                className="bulk-action-button"
                onClick={() => handleBulkFavorite(true)}
                disabled={selectedDocumentIds.length === 0}
              >
                ★ 즐겨찾기 추가
              </button>

              <button
                type="button"
                className="bulk-action-button"
                onClick={() => handleBulkFavorite(false)}
                disabled={selectedDocumentIds.length === 0}
              >
                ☆ 즐겨찾기 해제
              </button>

              <button
                type="button"
                className="bulk-delete-button"
                onClick={handleDeleteSelected}
                disabled={selectedDocumentIds.length === 0}
              >
                선택 삭제
              </button>

              <button
                type="button"
                className="bulk-action-button"
                onClick={handleCancelSelection}
              >
                취소
              </button>
            </>
          )}
        </div>

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
                : readingFilter === "unread"
                  ? "읽지 않은 자료가 없습니다."
                  : readingFilter === "reading"
                    ? "읽는 중인 자료가 없습니다."
                    : readingFilter === "completed"
                      ? "완독한 자료가 없습니다."
                      : typeFilter === "text"
                        ? "텍스트 자료가 없습니다."
                        : typeFilter === "file"
                          ? "파일 자료가 없습니다."
                          : typeFilter === "web"
                            ? "웹 자료가 없습니다."
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
                selectionMode={selectionMode}
                isSelected={selectedDocumentIds.includes(
                  document.id
                )}
                onToggleSelect={() =>
                  handleToggleSelect(document.id)
                }
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
          백업 파일을 안전하게 보관하고
          필요할 때 복원하세요.
        </p>

        <button
          type="button"
          className="delete-all-button"
          onClick={onDeleteAllDocuments}
          disabled={documents.length === 0}
        >
          전체 자료 삭제
        </button>
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
