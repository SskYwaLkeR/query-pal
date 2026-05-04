"use client";

import { useState, useCallback, useEffect } from "react";
import { Message, ConversationTurn, ChatResponse } from "@/types/chat";
import { v4 as uuid } from "uuid";

export function useChat(
  databaseId: string = "demo",
  conversationId: string | null = null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);
  const [fetchedConvId, setFetchedConvId] = useState<string | null>(null);

  // React-recommended pattern for syncing/resetting state when a prop changes,
  // avoiding setState inside a useEffect.
  // See: react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevConvId, setPrevConvId] = useState(conversationId);
  if (prevConvId !== conversationId) {
    setPrevConvId(conversationId);
    setActiveConversationId(conversationId);
    if (!conversationId) {
      setMessages([]);
      setFetchedConvId(null);
    }
  }

  const isLoadingConversation = conversationId != null && fetchedConvId !== conversationId;

  useEffect(() => {
    if (!conversationId || fetchedConvId === conversationId) return;

    const controller = new AbortController();

    fetch(`/api/conversations/${conversationId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.messages) return;
        setMessages(data.messages);
        setFetchedConvId(conversationId);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchedConvId(conversationId);
        setMessages([]);
      });

    return () => controller.abort();
  }, [conversationId, fetchedConvId]);

  const sendMessage = useCallback(
    async (text: string): Promise<{ conversationId: string; isNew: boolean } | undefined> => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setMessages((prev) => [
        ...prev,
        { id: uuid(), role: "user", content: trimmed, type: "success" },
      ]);
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

        const isNew = !activeConversationId && !!data.conversationId;
        if (data.conversationId) {
          if (!activeConversationId) setActiveConversationId(data.conversationId);
          // Mark fetched BEFORE the pathname changes to /c/[id] so the effect
          // skips the DB fetch and preserves full chart data already in state.
          setFetchedConvId(data.conversationId);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "assistant",
            content: data.explanation || data.message || "",
            sql: data.sql,
            data: data.data,
            chart: data.chart,
            followUps: data.followUps,
            type: data.type,
            resultSummary: data.resultSummary,
          },
        ]);

        if (data.conversationId) {
          return { conversationId: data.conversationId, isNew };
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "assistant",
            content: "Sorry, I encountered a network error. Please try again.",
            type: "error",
            followUps: [],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, databaseId, activeConversationId]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setFetchedConvId(null);
  }, []);

  return {
    messages,
    isLoading,
    isLoadingConversation,
    sendMessage,
    clearConversation,
    activeConversationId,
  };
}
