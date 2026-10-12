import type { Document } from "../types/document";

export const initialDocuments: Document[] = [
  {
    id: "1",
    title: "좋은 디자인이란 무엇인가",
    content:
      "좋은 디자인은 단순히 아름다운 화면을 만드는 것이 아니라 사용자가 원하는 행동을 쉽고 자연스럽게 할 수 있도록 돕는 것이다.\n\n사용자의 입장에서 생각하고 불필요한 복잡함을 줄이는 것이 중요하다.",
    type: "text",
    createdAt: new Date().toISOString(),
    isRead: false,
    isFavorite: false,
  },
];