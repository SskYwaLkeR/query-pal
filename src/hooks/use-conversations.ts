"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/conversation";

export function useConversations(databaseId: string = "demo") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
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

  useEffect(() => {
    setLoading(true);
    setConversations([]);
    fetchConversations();
  }, [fetchConversations]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

  // Add a new conversation or bump updatedAt for an existing one — no network call.
  const upsertConversation = useCallback(
    (conv: Conversation) => {
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
    },
    []
  );

  return {
    conversations,
    loading,
    deleteConversation,
    upsertConversation,
    refresh: fetchConversations,
  };
}
