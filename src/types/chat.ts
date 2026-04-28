import { ChartRecommendation, QueryResult } from "./query";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  data?: QueryResult;
  chart?: ChartRecommendation;
  followUps?: string[];
  type: "success" | "error" | "clarification" | "info" | "loading";
  resultSummary?: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  sql?: string;
  resultSummary?: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory: ConversationTurn[];
  databaseId?: string;
  conversationId?: string;
}

export interface ChatResponse {
  type: "success" | "error" | "clarification" | "info";
  sql?: string;
  explanation?: string;
  message?: string;
  data?: QueryResult;
  chart?: ChartRecommendation;
  followUps: string[];
  resultSummary?: string;
  conversationId?: string;
}
