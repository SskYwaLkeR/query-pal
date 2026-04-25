import { ChartRecommendation, QueryResult } from "./query";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  data?: QueryResult;
  chart?: ChartRecommendation;
  followUps?: string[];
  type: "success" | "error" | "clarification" | "loading";
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
}

export interface ChatResponse {
  type: "success" | "error" | "clarification";
  sql?: string;
  explanation?: string;
  message?: string;
  data?: QueryResult;
  chart?: ChartRecommendation;
  followUps: string[];
  resultSummary?: string;
}
