"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestedQuery: (query: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  onSuggestedQuery,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onSuggestedQuery={onSuggestedQuery}
          />
        ))}
        {isLoading && (
          <MessageBubble
            message={{
              id: "loading",
              role: "assistant",
              content: "",
              type: "loading",
            }}
            onSuggestedQuery={onSuggestedQuery}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
