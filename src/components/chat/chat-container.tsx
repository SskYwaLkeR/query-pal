"use client";

import { useChat } from "@/hooks/use-chat";
import { useConversations } from "@/hooks/use-conversations";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { WelcomeScreen } from "./welcome-screen";
import { ConversationSidebar } from "./conversation-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DatabaseSelector } from "@/components/database-selector";
import { DatabaseProvider, useDatabase } from "@/contexts/database-context";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

function ChatContainerInner({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { selectedDatabaseId, schema } = useDatabase();
  const {
    conversations,
    loading: convsLoading,
    deleteConversation,
    upsertConversation,
  } = useConversations(selectedDatabaseId);

  const {
    messages,
    isLoading,
    isLoadingConversation,
    sendMessage: rawSendMessage,
    clearConversation,
    activeConversationId,
  } = useChat(selectedDatabaseId, conversationId ?? null);

  const [showHistory, setShowHistory] = useState(false);
  const prevDbId = useRef(selectedDatabaseId);
  const navigatedRef = useRef(false);

  // Navigate to the conversation URL once the first message creates one
  useEffect(() => {
    if (activeConversationId && !conversationId && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace(`/c/${activeConversationId}`);
    }
  }, [activeConversationId, conversationId, router]);

  // Reset navigation guard when the conversation prop changes
  useEffect(() => {
    navigatedRef.current = false;
  }, [conversationId]);

  // When database switches, go back to root — useChat clears messages when
  // conversationId drops to null via the pathname change
  useEffect(() => {
    if (prevDbId.current !== selectedDatabaseId) {
      prevDbId.current = selectedDatabaseId;
      clearConversation();
      router.push("/");
    }
  }, [selectedDatabaseId, clearConversation, router]);

  const sendMessage = async (text: string) => {
    const result = await rawSendMessage(text);
    if (result) {
      const now = new Date().toISOString();
      const title =
        text.trim().length > 50 ? text.trim().slice(0, 47) + "..." : text.trim();
      upsertConversation({
        id: result.conversationId,
        databaseId: selectedDatabaseId,
        title: result.isNew ? title : (conversations.find((c) => c.id === result.conversationId)?.title ?? title),
        createdAt: conversations.find((c) => c.id === result.conversationId)?.createdAt ?? now,
        updatedAt: now,
      });
    }
  };

  const handleSelect = (id: string) => router.push(`/c/${id}`);
  const handleNewChat = () => { clearConversation(); router.push("/"); };
  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (id === conversationId) router.push("/");
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-background bg-grid-pattern">
      <WelcomeModal onQuery={sendMessage} />
      {showHistory && (
        <>
          {/* Backdrop — mobile only */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />
          {/* Sidebar — fixed overlay on mobile, inline on desktop */}
          <div className="fixed inset-y-0 left-0 z-50 flex md:static md:inset-auto md:z-auto">
            <ConversationSidebar
              conversations={conversations}
              loading={convsLoading}
              activeId={conversationId ?? null}
              onSelect={(id) => { handleSelect(id); setShowHistory(false); }}
              onDelete={handleDelete}
              onNewChat={() => { handleNewChat(); setShowHistory(false); }}
            />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 glass">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              title={showHistory ? "Hide history" : "Show history"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4"
              >
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            <h1
              onClick={handleNewChat}
              className="text-lg font-bold bg-gradient-to-r from-[#f43f5e] to-[#6366f1] bg-clip-text text-transparent cursor-pointer"
            >
              QueryPal
            </h1>
            <DatabaseSelector />
            <span className="text-xs text-primary/70 bg-primary/8 px-2.5 py-0.5 rounded-full">
              {schema
                ? `${schema.tables.length} table${schema.tables.length !== 1 ? "s" : ""}`
                : "connecting..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              title="New chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <Link
              href="/admin"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors"
              title="Manage connections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {isLoadingConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading conversation...
            </div>
          </div>
        ) : hasMessages ? (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onSuggestedQuery={sendMessage}
          />
        ) : (
          <WelcomeScreen onSelectQuery={sendMessage} schema={schema} />
        )}

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export function ChatContainer() {
  const pathname = usePathname();
  const conversationId = pathname.match(/^\/c\/([^/]+)/)?.[1];
  return (
    <DatabaseProvider>
      <ChatContainerInner conversationId={conversationId} />
    </DatabaseProvider>
  );
}
