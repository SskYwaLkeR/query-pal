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
          className="text-xs px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground hover:border-primary/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-primary/5"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
