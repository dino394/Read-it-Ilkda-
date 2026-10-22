import { apiRequest } from "./client";
import type { Document } from "../types/document";

interface DocumentsResponse {
  success: boolean;
  documents: Document[];
}

interface DocumentResponse {
  success: boolean;
  message: string;
  document: Document;
}

export async function getDocuments() {
  return apiRequest<DocumentsResponse>(
    "/api/documents"
  );
}

export async function createDocument(
  document: Omit<
    Document,
    "id" | "createdAt"
  >
) {
  return apiRequest<DocumentResponse>(
    "/api/documents",
    {
      method: "POST",
      body: JSON.stringify({
        title: document.title,
        content: document.content,
        type: document.type,
        url: document.url ?? null,
        is_read: document.isRead,
        is_favorite: document.isFavorite,
      }),
    }
  );
}

export async function updateDocument(
  id: string,
  document: Partial<Document>
) {
  return apiRequest<DocumentResponse>(
    `/api/documents/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title: document.title,
        content: document.content,
        type: document.type,
        url: document.url ?? null,
        is_read: document.isRead,
        is_favorite: document.isFavorite,
      }),
    }
  );
}

export async function deleteDocument(
  id: string
) {
  return apiRequest<{
    success: boolean;
    message: string;
  }>(`/api/documents/${id}`, {
    method: "DELETE",
  });
}