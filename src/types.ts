export interface KnowledgeItem {
  id: string;
  title: string;
  type: "url" | "note" | "document" | "code" | "drive" | "gmail" | "social";
  sourceUrl?: string;
  rawContent: string;
  summary: string;
  tags: string[];
  createdAt: string;
  relevanceScore?: number;
  metadata?: {
    author?: string;
    fileSize?: string;
    fileType?: string;
    domain?: string;
    readingTime?: string;
    snippetCount?: number;
  };
}

export interface RecallResult {
  query: string;
  synthesis: string;
  matches: KnowledgeItem[];
  totalIndexed: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  referencedMemories?: {
    title: string;
    type: string;
    url?: string;
    similarity: number;
  }[];
}

export type AppMode = "recall" | "dump" | "chat" | "inventory";
