import {
  getDocuments,
  createDocument,
} from "./api/documents";
import { useEffect, useState } from "react";

import "./App.css";

import Login from "./pages/Login";

import Header from "./components/Header";
import Home from "./pages/Home";
import Reader from "./pages/Reader";
import { initialDocuments } from "./data/initialDocuments";

import type { Document } from "./types/document";

function isDocumentArray(
  value: unknown
): value is Document[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();

  return value.every((item: unknown) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const doc =
      item as Record<string, unknown>;

    const valid =
      typeof doc.id === "string" &&
      doc.id.trim() !== "" &&
      typeof doc.title === "string" &&
      typeof doc.content === "string" &&
      (doc.type === "text" ||
        doc.type === "file" ||
        doc.type === "web") &&
      typeof doc.createdAt === "string" &&
      !Number.isNaN(
        Date.parse(doc.createdAt)
      ) &&
      typeof doc.isRead === "boolean" &&
      typeof doc.isFavorite === "boolean";

    if (!valid) {
      return false;
    }

    if (ids.has(doc.id as string)) {
      return false;
    }

    ids.add(doc.id as string);

    return true;
  });
}

function App() {
  
   const [isLoggedIn, setIsLoggedIn] =
    useState(
      Boolean(
        localStorage.getItem(
          "read-it-token"
        )
      )
    );
    useEffect(() => {
  if (!isLoggedIn) {
    return;
  }

  async function loadCloudDocuments() {
    try {
      const data = await getDocuments();

      console.log(
        "서버에서 불러온 문서:",
        data.documents
      );
      setDocuments(data.documents);
    } catch (error) {
      console.error(
        "서버 문서를 불러오지 못했습니다:",
        error
      );
    }
  }

  loadCloudDocuments();
}, [isLoggedIn]);

  const [documents, setDocuments] =
    useState<Document[]>(() => {
      try {
        const savedDocuments =
          localStorage.getItem(
            "read-it-documents"
          );

        if (savedDocuments) {
          const parsed: unknown =
            JSON.parse(savedDocuments);

          if (isDocumentArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        console.error(
          "저장된 자료를 불러오지 못했습니다."
        );
      }

      return initialDocuments;
    });

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] = useState<string | null>(null);

  const [darkMode, setDarkMode] =
    useState(false);

  useEffect(() => {
    localStorage.setItem(
      "read-it-documents",
      JSON.stringify(documents)
    );
  }, [documents]);

  const selectedDocument =
    documents.find(
      (document) =>
        document.id === selectedDocumentId
    );

  const handleExportBackup = () => {
    const backupData = {
      app: "읽다",
      version: 1,
      exportedAt:
        new Date().toISOString(),
      documents,
    };

    const blob = new Blob(
      [
        JSON.stringify(
          backupData,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `읽다-백업-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  const handleAddUrl = (
    url: string,
    title: string,
    content: string
  ) => {
    const normalizedUrl =
      new URL(url).href;

    const isDuplicate =
      documents.some((document) => {
        if (!document.url) {
          return false;
        }

        return (
          document.url ===
          normalizedUrl
        );
      });

    if (isDuplicate) {
      alert(
        "이미 자료실에 저장된 웹페이지입니다."
      );

      return;
    }

    const newDocument: Document = {
      id: crypto.randomUUID(),
      title,
      content,
      type: "web",
      url: normalizedUrl,
      createdAt:
        new Date().toISOString(),
      isRead: false,
      isFavorite: false,
    };

    setDocuments(
      (previousDocuments) => [
        newDocument,
        ...previousDocuments,
      ]
    );
  };

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".json")
    ) {
      alert(
        "JSON 백업 파일만 불러올 수 있습니다."
      );

      return;
    }

    try {
      const text =
        await file.text();

      const parsed: unknown =
        JSON.parse(text);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        throw new Error(
          "올바르지 않은 백업 파일입니다."
        );
      }

      const backup =
        parsed as Record<
          string,
          unknown
        >;

      if (
        backup.app !== "읽다" ||
        backup.version !== 1 ||
        !isDocumentArray(
          backup.documents
        )
      ) {
        throw new Error(
          "읽다에서 만든 올바른 백업 파일이 아닙니다."
        );
      }

      const importedDocuments =
        backup.documents;

      const confirmed =
        window.confirm(
          `백업 파일의 자료 ${importedDocuments.length}개를 불러옵니다.\n` +
            `현재 자료 ${documents.length}개는 백업 자료로 교체됩니다.\n\n` +
            "복원 전에 현재 자료도 백업했나요?\n계속할까요?"
        );

      if (!confirmed) {
        return;
      }

      const idsToClear =
        new Set([
          ...documents.map(
            (document) =>
              document.id
          ),
          ...importedDocuments.map(
            (document) =>
              document.id
          ),
        ]);

      idsToClear.forEach((id) => {
        localStorage.removeItem(
          `read-it-position-${id}`
        );
      });

      setSelectedDocumentId(null);

      setDocuments(
        importedDocuments
      );

      alert(
        `복원 완료!\n자료 ${importedDocuments.length}개를 불러왔습니다.`
      );
    } catch {
      alert(
        "백업 파일을 불러오지 못했습니다.\n파일이 올바른지 확인해 주세요."
      );
    }
  };

  
  const handleAddText = async (
    title: string,
    content: string
  ) => {
    try {
      const data = await createDocument({
        title,
        content,
        type: "text",
        isRead: false,
        isFavorite: false,
      });

      const saved =
        data.document as unknown as Record<
          string,
          unknown
        >;

      const newDocument: Document = {
        id: String(saved.id),
        title: String(saved.title),
        content: String(saved.content),
        type: saved.type as Document["type"],
        ...(typeof saved.url === "string"
          ? { url: saved.url }
          : {}),
        createdAt: String(saved.created_at),
        isRead: Boolean(saved.is_read),
        isFavorite: Boolean(saved.is_favorite),
      };

      setDocuments((currentDocuments) => [
        newDocument,
        ...currentDocuments,
      ]);
    } catch (error) {
      console.error("문서 저장 실패:", error);

      alert(
        error instanceof Error
          ? `문서 저장 실패: ${error.message}`
          : "문서를 서버에 저장하지 못했습니다."
      );
    }
  };


  const handleAddFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileName =
      file.name.toLowerCase();

    const isTextFile =
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md");

    if (!isTextFile) {
      alert(
        "현재는 TXT와 MD 파일만 추가할 수 있습니다."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result !==
        "string"
      ) {
        alert(
          "파일을 읽을 수 없습니다."
        );

        return;
      }

      const newDocument: Document = {
        id: crypto.randomUUID(),
        title: file.name.replace(
          /\.(txt|md)$/i,
          ""
        ),
        content: reader.result,
        type: "file",
        createdAt:
          new Date().toISOString(),
        isRead: false,
        isFavorite: false,
      };

      setDocuments(
        (currentDocuments) => [
          newDocument,
          ...currentDocuments,
        ]
      );
    };

    reader.onerror = () => {
      alert(
        "파일을 읽는 중 문제가 발생했습니다."
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  const handleMarkAsRead = (
    id: string
  ) => {
    setDocuments(
      (currentDocuments) =>
        currentDocuments.map(
          (document) =>
            document.id === id
              ? {
                  ...document,
                  isRead: true,
                }
              : document
        )
    );
  };

  const handleToggleFavorite = (
    id: string
  ) => {
    setDocuments(
      (currentDocuments) =>
        currentDocuments.map(
          (document) =>
            document.id === id
              ? {
                  ...document,
                  isFavorite:
                    !document.isFavorite,
                }
              : document
        )
    );
  };

  const handleEditDocument = (
    id: string,
    title: string,
    content: string
  ) => {
    localStorage.removeItem(
      `read-it-position-${id}`
    );

    setDocuments(
      (currentDocuments) =>
        currentDocuments.map(
          (document) =>
            document.id === id
              ? {
                  ...document,
                  title,
                  content,
                }
              : document
        )
    );
  };

  const handleDeleteAllDocuments =
    () => {
      if (documents.length === 0) {
        alert(
          "삭제할 자료가 없습니다."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `저장된 자료 ${documents.length}개를 모두 삭제할까요?\n\n` +
            "읽기 위치와 진행률도 함께 삭제됩니다.\n" +
            "이 작업은 되돌릴 수 없습니다.\n\n" +
            "삭제 전에 JSON 백업을 권장합니다."
        );

      if (!confirmed) {
        return;
      }

      documents.forEach((doc) => {
        localStorage.removeItem(
          `read-it-position-${doc.id}`
        );

        localStorage.removeItem(
          `read-it-progress-${doc.id}`
        );

        localStorage.removeItem(
          `read-it-completed-${doc.id}`
        );

        localStorage.removeItem(
          `read-it-reset-${doc.id}`
        );
      });

      setSelectedDocumentId(null);

      setDocuments([]);

      alert(
        "모든 자료를 삭제했습니다."
      );
    };

  const handleDeleteDocument = (
    id: string
  ) => {
    const targetDocument =
      documents.find(
        (document) =>
          document.id === id
      );

    if (!targetDocument) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${targetDocument.title}" 자료를 삭제할까요?\n삭제한 자료는 복구할 수 없습니다.`
      );

    if (!confirmed) {
      return;
    }

    setDocuments(
      (currentDocuments) =>
        currentDocuments.filter(
          (document) =>
            document.id !== id
        )
    );

    localStorage.removeItem(
      `read-it-position-${id}`
    );

    setSelectedDocumentId(null);
  };

  const handleDeleteMultipleDocuments =
    (ids: string[]) => {
      const idsToDelete =
        new Set(ids);

      idsToDelete.forEach((id) => {
        localStorage.removeItem(
          `read-it-position-${id}`
        );

        localStorage.removeItem(
          `read-it-progress-${id}`
        );

        localStorage.removeItem(
          `read-it-completed-${id}`
        );

        localStorage.removeItem(
          `read-it-reset-${id}`
        );
      });

      setDocuments(
        (previous) =>
          previous.filter(
            (document) =>
              !idsToDelete.has(
                document.id
              )
          )
      );

      setSelectedDocumentId(
        (previous) =>
          previous &&
          idsToDelete.has(previous)
            ? null
            : previous
      );
    };
  if (!isLoggedIn) {
    return (
      <Login
        onLoginSuccess={() =>
          setIsLoggedIn(true)
        }
      />
    );
  }
  return (
    <div
      className={`app ${
        darkMode ? "dark" : ""
      }`}
    >
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() =>
          setDarkMode(
            (value) => !value
          )
        }
      />

      {selectedDocument ? (
        <Reader
          document={selectedDocument}
          onBack={() =>
            setSelectedDocumentId(null)
          }
          onMarkAsRead={
            handleMarkAsRead
          }
        />
      ) : (
        <Home
          documents={documents}
          onSelectDocument={
            setSelectedDocumentId
          }
          onAddText={handleAddText}
          onAddFile={handleAddFile}
          onDeleteDocument={
            handleDeleteDocument
          }
          onToggleFavorite={
            handleToggleFavorite
          }
          onEditDocument={
            handleEditDocument
          }
          onExportBackup={
            handleExportBackup
          }
          onImportBackup={
            handleImportBackup
          }
          onAddUrl={handleAddUrl}
          onDeleteAllDocuments={
            handleDeleteAllDocuments
          }
          onDeleteMultipleDocuments={
            handleDeleteMultipleDocuments
          }
        />
      )}
    </div>
  );
}

export default App;