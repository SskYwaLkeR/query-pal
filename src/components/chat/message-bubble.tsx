"use client";

import { Message } from "@/types/chat";
import { ResultPanel } from "@/components/results/result-panel";
import { SuggestedQueries } from "./suggested-queries";

function InfoContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onSuggestedQuery: (query: string) => void;
}

export function MessageBubble({ message, onSuggestedQuery }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm gradient-user-bubble text-white px-4 py-2.5 text-sm shadow-md shadow-primary/10">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] w-full">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-xl gradient-primary flex items-center justify-center mt-0.5 shadow-sm shadow-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4">
              <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {message.type === "error" && (
              <div className="text-sm">
                <div className="text-destructive/80 whitespace-pre-wrap">
                  {message.content}
                </div>
                {message.sql && (
                  <div className="mt-3">
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        View generated query
                      </summary>
                      <pre className="mt-2 p-2 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                        {message.sql}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            {message.type === "clarification" && (
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            )}

            {message.type === "info" && (
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                <InfoContent content={message.content} />
              </div>
            )}

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

            {message.type === "loading" && (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
              </div>
            )}

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
