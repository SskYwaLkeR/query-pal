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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);

  // Tracks which conversationId already has messages loaded in state.
  // Set by sendMessage (after API response) so that the subsequent pathname
  // change to /c/[id] doesn't trigger a DB re-fetch — messages are already
  // in state with full data (chart rows etc.) and we don't want to overwrite them.
  const fetchedForRef = useRef<string | null>(null);

  // True while we have a conversationId but haven't loaded messages yet.
  // Computed so no setState fires synchronously in the effect.
  const isLoadingConversation =
    conversationId != null && fetchedForRef.current !== conversationId;

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setActiveConversationId(null);
      fetchedForRef.current = null;
      return;
    }

    setActiveConversationId(conversationId);

    // Already populated by sendMessage — skip the DB fetch entirely.
    // This is the key to zero-flicker navigation from / to /c/[id].
    if (fetchedForRef.current === conversationId) return;

    const controller = new AbortController();

    fetch(`/api/conversations/${conversationId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.messages) return;
        setMessages(data.messages);
        fetchedForRef.current = conversationId;
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        fetchedForRef.current = conversationId;
        setMessages([]);
      });

    return () => controller.abort();
    // No fetchedForRef reset in cleanup: layout never remounts between chat
    // routes so refs persist. Reset only happens when conversationId → null.
  }, [conversationId]);

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
          // Mark as fetched BEFORE the pathname changes to /c/[id].
          // When the layout re-renders with the new conversationId, the effect
          // sees fetchedForRef.current === conversationId and skips the DB fetch,
          // preserving the full message with data/chart in state.
          fetchedForRef.current = data.conversationId;
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
    fetchedForRef.current = null;
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
