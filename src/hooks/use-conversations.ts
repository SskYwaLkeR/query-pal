"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/conversation";

export function useConversations(databaseId: string = "demo") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const [prevDatabaseId, setPrevDatabaseId] = useState(databaseId);
  if (prevDatabaseId !== databaseId) {
    setPrevDatabaseId(databaseId);
    setLoading(true);
    setConversations([]);
  }

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/conversations?databaseId=${encodeURIComponent(databaseId)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (Array.isArray(data)) setConversations(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [databaseId]);

  const deleteConversation = useCallback(async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const upsertConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      if (idx === -1) return [conv, ...prev];
      const updated = [...prev];
      updated[idx] = conv;
      updated.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return updated;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversations?databaseId=${encodeURIComponent(databaseId)}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [databaseId]);

  return {
    conversations,
    loading,
    deleteConversation,
    upsertConversation,
    refresh,
  };
}
