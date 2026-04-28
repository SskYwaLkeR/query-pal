"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ConversationTurn, ChatResponse } from "@/types/chat";
import { v4 as uuid } from "uuid";

export function useChat(
  databaseId: string = "demo",
  conversationId: string | null = null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId);
  const loadedConvRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      if (loadedConvRef.current !== null) {
        setMessages([]);
        loadedConvRef.current = null;
        setActiveConversationId(null);
      }
      return;
    }
    if (conversationId === loadedConvRef.current) return;

    loadedConvRef.current = conversationId;
    setActiveConversationId(conversationId);

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.messages && !controller.signal.aborted) {
          setMessages(data.messages);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    })();
    return () => controller.abort();
  }, [conversationId]);

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
          body: JSON.stringify({
            message: trimmed,
            conversationHistory: history,
            databaseId,
            conversationId: activeConversationId,
          }),
        });

        const data: ChatResponse = await response.json();

        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
          loadedConvRef.current = data.conversationId;
        }

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
    [messages, isLoading, databaseId, activeConversationId]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    loadedConvRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearConversation,
    activeConversationId,
  };
}
