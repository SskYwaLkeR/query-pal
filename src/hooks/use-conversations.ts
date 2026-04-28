"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/conversation";

export function useConversations(databaseId: string = "demo") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

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
    setActiveConversationId(null);
    fetchConversations();
  }, [fetchConversations]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (activeConversationId === id) setActiveConversationId(null);
      await fetchConversations();
    },
    [activeConversationId, fetchConversations]
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    loading,
    activeConversationId,
    setActiveConversationId,
    deleteConversation,
    startNewConversation,
    refresh: fetchConversations,
  };
}
