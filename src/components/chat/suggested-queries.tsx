"use client";

interface SuggestedQueriesProps {
  suggestions: string[];
  onSelect: (query: string) => void;
}

export function SuggestedQueries({ suggestions, onSelect }: SuggestedQueriesProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
