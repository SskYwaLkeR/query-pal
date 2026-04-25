"use client";

import { Message } from "@/types/chat";
import { ResultPanel } from "@/components/results/result-panel";
import { SuggestedQueries } from "./suggested-queries";

interface MessageBubbleProps {
  message: Message;
  onSuggestedQuery: (query: string) => void;
}

export function MessageBubble({ message, onSuggestedQuery }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] w-full">
        {/* Assistant icon */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-primary">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5V19A9 3 0 0 0 21 19V5" />
              <path d="M3 12A9 3 0 0 0 21 12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {/* Error state */}
            {message.type === "error" && (
              <div className="text-sm">
                <div className="text-destructive/80 whitespace-pre-wrap">
                  {message.content}
                </div>
                {message.sql && (
                  <div className="mt-3">
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        View generated SQL
                      </summary>
                      <pre className="mt-2 p-2 rounded bg-muted font-mono text-xs overflow-x-auto">
                        {message.sql}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* Clarification state */}
            {message.type === "clarification" && (
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            )}

            {/* Success state */}
            {message.type === "success" && (
              <div>
                <p className="text-sm text-foreground">{message.content}</p>
                {message.data && message.chart && message.sql && (
                  <ResultPanel
                    data={message.data}
                    chart={message.chart}
                    sql={message.sql}
                  />
                )}
              </div>
            )}

            {/* Loading state */}
            {message.type === "loading" && (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            )}

            {/* Follow-up suggestions */}
            {message.followUps && message.followUps.length > 0 && (
              <SuggestedQueries
                suggestions={message.followUps}
                onSelect={onSuggestedQuery}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
