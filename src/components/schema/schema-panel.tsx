"use client";

import { SchemaInfo } from "@/types/schema";
import { TableCard } from "./table-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SchemaPanelProps {
  schema: SchemaInfo | null;
  loading: boolean;
}

export function SchemaPanel({ schema, loading }: SchemaPanelProps) {
  const maxRowCount = schema
    ? Math.max(...schema.tables.map((t) => t.rowCount))
    : 0;
  const totalRecords = schema
    ? schema.tables.reduce((sum, t) => sum + t.rowCount, 0)
    : 0;

  return (
    <div className="w-72 border-r glass-subtle flex flex-col h-full bg-dots-pattern">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-primary">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="8" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
            <rect x="13" y="13" width="8" height="8" rx="2" />
          </svg>
          Your Data
        </h2>
        {schema && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {totalRecords.toLocaleString()} total records
          </p>
        )}
      </div>
      <ScrollArea className="flex-1 p-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-2 bg-muted rounded w-1/3 mb-2" />
                <div className="h-1 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        )}
        {schema &&
          schema.tables.map((table) => (
            <TableCard
              key={table.name}
              table={table}
              maxRowCount={maxRowCount}
            />
          ))}
      </ScrollArea>
    </div>
  );
}
