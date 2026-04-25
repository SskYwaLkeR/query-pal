"use client";

import { useChat } from "@/hooks/use-chat";
import { useSchema } from "@/hooks/use-schema";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { WelcomeScreen } from "./welcome-screen";
import { SchemaPanel } from "@/components/schema/schema-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export function ChatContainer() {
  const { messages, isLoading, sendMessage, clearConversation } = useChat();
  const { schema, loading: schemaLoading } = useSchema();
  const [showSchema, setShowSchema] = useState(true);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-background">
      {/* Schema sidebar — hidden on mobile */}
      {showSchema && (
        <div className="hidden md:block">
          <SchemaPanel schema={schema} loading={schemaLoading} />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
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
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {schema ? `${schema.tables.length} tables` : "loading..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Messages or welcome screen */}
        {hasMessages ? (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onSuggestedQuery={sendMessage}
          />
        ) : (
          <WelcomeScreen onSelectQuery={sendMessage} />
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
