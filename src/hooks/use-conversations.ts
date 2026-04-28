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
      await fetchConversations();
    },
    [fetchConversations]
  );

  return {
    conversations,
    loading,
    deleteConversation,
    refresh: fetchConversations,
  };
}
