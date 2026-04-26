"use client";

import { useMemo } from "react";
import { SchemaInfo } from "@/types/schema";

interface WelcomeScreenProps {
  onSelectQuery: (query: string) => void;
  schema: SchemaInfo | null;
}

type IconName = "users" | "chart" | "pie" | "alert" | "globe" | "trend" | "table" | "search";

interface Suggestion {
  label: string;
  icon: IconName;
}

function generateSuggestions(schema: SchemaInfo): Suggestion[] {
  const tables = schema.tables;
  const suggestions: Suggestion[] = [];

  const tableNames = tables.map((t) => t.name);

  const findTable = (...candidates: string[]) =>
    tables.find((t) => candidates.some((c) => t.name.toLowerCase().includes(c)));

  const hasColumn = (t: { columns: { name: string }[] }, ...candidates: string[]) =>
    t.columns.some((c) => candidates.some((n) => c.name.toLowerCase().includes(n)));

  // 1. Row count question for the most prominent table
  const mainTable = tables.reduce((a, b) => (b.rowCount > a.rowCount ? b : a), tables[0]);
  if (mainTable) {
    suggestions.push({
      label: `How many ${mainTable.name} do we have?`,
      icon: "users",
    });
  }

  // 2. Time-series question if any table has a date/time column
  const dateTable = tables.find((t) =>
    hasColumn(t, "created_at", "ordered_at", "signed_up_at", "joined_at", "release_date", "date", "stream_date")
  );
  if (dateTable) {
    const dateCol = dateTable.columns.find((c) =>
      ["created_at", "ordered_at", "signed_up_at", "joined_at", "release_date", "date", "stream_date"].some((d) =>
        c.name.toLowerCase().includes(d)
      )
    );
    if (dateCol) {
      suggestions.push({
        label: `Show me ${dateTable.name} over time`,
        icon: "chart",
      });
    }
  }

  // 3. Breakdown / category question
  const categoryTable = findTable("categor", "genre", "type", "plan", "status");
  if (categoryTable) {
    suggestions.push({
      label: `What's the breakdown by ${categoryTable.name}?`,
      icon: "pie",
    });
  } else {
    const tableWithCategory = tables.find((t) =>
      hasColumn(t, "category", "genre", "type", "status", "plan", "country")
    );
    if (tableWithCategory) {
      const col = tableWithCategory.columns.find((c) =>
        ["category", "genre", "type", "status", "plan", "country"].some((n) =>
          c.name.toLowerCase().includes(n)
        )
      );
      if (col) {
        suggestions.push({
          label: `Show ${tableWithCategory.name} breakdown by ${col.name.replace(/_/g, " ")}`,
          icon: "pie",
        });
      }
    }
  }

  // 4. Top N / ranking question
  const numericTable = tables.find((t) =>
    hasColumn(t, "price", "total", "revenue", "amount", "rating", "stream_count", "salary", "score", "lifetime_value", "follower_count")
  );
  if (numericTable) {
    const numCol = numericTable.columns.find((c) =>
      ["price", "total", "revenue", "amount", "rating", "stream_count", "salary", "score", "lifetime_value", "follower_count"].some((n) =>
        c.name.toLowerCase().includes(n)
      )
    );
    if (numCol) {
      suggestions.push({
        label: `Top 5 ${numericTable.name} by ${numCol.name.replace(/_/g, " ")}`,
        icon: "trend",
      });
    }
  }

  // 5. Relationship / join question
  if (schema.relationships.length > 0) {
    const rel = schema.relationships[0];
    suggestions.push({
      label: `Show ${rel.fromTable} with their ${rel.toTable}`,
      icon: "search",
    });
  }

  // 6. Overview question
  if (tables.length > 1) {
    const secondTable = tables.find((t) => t.name !== mainTable?.name) || tables[1];
    suggestions.push({
      label: `Show me all ${secondTable.name}`,
      icon: "table",
    });
  }

  // Ensure we have exactly 6 suggestions — pad with generic table queries
  const remaining = tables.filter(
    (t) => !suggestions.some((s) => s.label.toLowerCase().includes(t.name.toLowerCase()))
  );
  const icons: IconName[] = ["globe", "alert", "users", "chart"];
  let iconIdx = 0;
  while (suggestions.length < 6 && remaining.length > 0) {
    const t = remaining.shift()!;
    suggestions.push({
      label: `Summarize the ${t.name} data`,
      icon: icons[iconIdx++ % icons.length],
    });
  }

  return suggestions.slice(0, 6);
}

const FALLBACK_QUERIES: Suggestion[] = [
  { label: "How many records are in each table?", icon: "users" },
  { label: "Show me the first 10 rows", icon: "table" },
  { label: "What tables are available?", icon: "search" },
  { label: "Summarize the data", icon: "chart" },
];

const ICONS: Record<IconName, React.ReactNode> = {
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  chart: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  pie: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  trend: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  table: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
};

export function WelcomeScreen({ onSelectQuery, schema }: WelcomeScreenProps) {
  const queries = useMemo(
    () => (schema ? generateSuggestions(schema) : FALLBACK_QUERIES),
    [schema]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-primary">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          Talk to your database
        </h1>
        <p className="text-muted-foreground mb-8">
          Ask questions in plain English. Get SQL, charts, and insights instantly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {queries.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelectQuery(q.label)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent text-left transition-colors group cursor-pointer"
            >
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {ICONS[q.icon]}
              </span>
              <span className="text-sm">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
