export type DocumentType = "text" | "file" | "web";

export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  url?: string;
  createdAt: string;
  isRead: boolean;
  isFavorite: boolean;
}