"use client";

import { SchemaInfo } from "@/types/schema";
import { TableCard } from "./table-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SchemaPanelProps {
  schema: SchemaInfo | null;
  loading: boolean;
}

export function SchemaPanel({ schema, loading }: SchemaPanelProps) {
  return (
    <div className="w-72 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
          </svg>
          Database Schema
        </h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading schema...</div>
        )}
        {schema && (
          <>
            {schema.tables.map((table, i) => (
              <div key={table.name}>
                <TableCard table={table} />
                {i < schema.tables.length - 1 && (
                  <Separator className="mb-4" />
                )}
              </div>
            ))}
            {schema.relationships.length > 0 && (
              <>
                <Separator className="mb-4" />
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-2">Relationships</div>
                  {schema.relationships.map((rel, i) => (
                    <div key={i} className="mb-1 font-mono">
                      {rel.fromTable}.{rel.fromColumn} → {rel.toTable}.{rel.toColumn}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
