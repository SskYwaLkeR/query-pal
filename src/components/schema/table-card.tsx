"use client";

import { useState } from "react";
import { TableInfo } from "@/types/schema";

interface TableCardProps {
  table: TableInfo;
  maxRowCount: number;
}

function humanize(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTableIcon(name: string) {
  const n = name.toLowerCase();
  if (["user", "customer", "person", "employee", "member", "listener"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (["order", "purchase", "sale", "transaction", "invoice"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  if (["product", "item", "inventory", "catalog"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }
  if (["categor", "genre", "type", "tag"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (["artist", "album", "track", "song", "music", "playlist"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  if (["review", "comment", "feedback", "rating"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (["stream", "play", "listen", "view", "log", "history", "event"].some((k) => n.includes(k))) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M3 15h18" />
    </svg>
  );
}

export function TableCard({ table, maxRowCount }: TableCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sizePercent =
    maxRowCount > 0 ? (table.rowCount / maxRowCount) * 100 : 0;

  return (
    <div className="mb-3 p-3 rounded-xl bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          {getTableIcon(table.name)}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block leading-tight">
            {humanize(table.name)}
          </span>
          <span className="text-xs text-muted-foreground">
            {table.rowCount.toLocaleString()} records
          </span>
        </div>
      </div>

      <div className="h-1 rounded-full bg-muted mt-2.5 overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${Math.max(sizePercent, 4)}%` }}
        />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-primary/70 hover:text-primary mt-2 transition-colors cursor-pointer"
      >
        {expanded ? "Hide details" : "See details"}
      </button>

      {expanded && (
        <div className="mt-1.5 pt-1.5 border-t border-border/30 space-y-0.5">
          {table.columns.map((col) => (
            <div
              key={col.name}
              className="text-xs text-muted-foreground py-0.5 pl-1"
            >
              {humanize(col.name)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
