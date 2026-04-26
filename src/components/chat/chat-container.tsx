"use client";

import { useChat } from "@/hooks/use-chat";
import { useSchema } from "@/hooks/use-schema";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { WelcomeScreen } from "./welcome-screen";
import { SchemaPanel } from "@/components/schema/schema-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { DatabaseSelector } from "@/components/database-selector";
import { DatabaseProvider, useDatabase } from "@/contexts/database-context";
import { useState, useEffect, useRef } from "react";

function ChatContainerInner() {
  const { selectedDatabaseId } = useDatabase();
  const { messages, isLoading, sendMessage, clearConversation } =
    useChat(selectedDatabaseId);
  const { schema, loading: schemaLoading } = useSchema(selectedDatabaseId);
  const [showSchema, setShowSchema] = useState(true);
  const prevDbId = useRef(selectedDatabaseId);

  useEffect(() => {
    if (prevDbId.current !== selectedDatabaseId) {
      clearConversation();
      prevDbId.current = selectedDatabaseId;
    }
  }, [selectedDatabaseId, clearConversation]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-background">
      {showSchema && (
        <div className="hidden md:block">
          <SchemaPanel schema={schema} loading={schemaLoading} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSchema(!showSchema)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title={showSchema ? "Hide schema" : "Show schema"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">QueryPal</h1>
            <DatabaseSelector />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {schema ? `${schema.tables.length} tables` : "loading..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
              title="Manage connections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </a>
            <ThemeToggle />
            {hasMessages && (
              <button
                onClick={clearConversation}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                New conversation
              </button>
            )}
          </div>
        </header>

        {hasMessages ? (
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
  return (
    <DatabaseProvider>
      <ChatContainerInner />
    </DatabaseProvider>
  );
}
