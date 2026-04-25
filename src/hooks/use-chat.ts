"use client";

import { useState, useCallback } from "react";
import { Message, ConversationTurn, ChatResponse } from "@/types/chat";
import { v4 as uuid } from "uuid";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: uuid(),
        role: "user",
        content: trimmed,
        type: "success",
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Build conversation history for context
      const history: ConversationTurn[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
        sql: m.sql,
        resultSummary: m.resultSummary,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, conversationHistory: history }),
        });

        const data: ChatResponse = await response.json();

        const assistantMsg: Message = {
          id: uuid(),
          role: "assistant",
          content: data.explanation || data.message || "",
          sql: data.sql,
          data: data.data,
          chart: data.chart,
          followUps: data.followUps,
          type: data.type,
          resultSummary: data.resultSummary,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: Message = {
          id: uuid(),
          role: "assistant",
          content:
            "Sorry, I encountered a network error. Please try again.",
          type: "error",
          followUps: [],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearConversation };
}
