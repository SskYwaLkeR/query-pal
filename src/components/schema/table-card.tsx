"use client";

import { TableInfo } from "@/types/schema";
import { Badge } from "@/components/ui/badge";

interface TableCardProps {
  table: TableInfo;
}

export function TableCard({ table }: TableCardProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{table.name}</span>
        <Badge variant="secondary" className="text-[10px] font-normal">
          {table.rowCount} rows
        </Badge>
      </div>
      <div className="space-y-0.5">
        {table.columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"
          >
            {col.isPrimaryKey && (
              <span className="text-amber-500" title="Primary Key">
                PK
              </span>
            )}
            {col.isForeignKey && (
              <span className="text-blue-500" title={`FK → ${col.foreignTable}`}>
                FK
              </span>
            )}
            {!col.isPrimaryKey && !col.isForeignKey && (
              <span className="w-5" />
            )}
            <span className="font-mono">{col.name}</span>
            <span className="text-muted-foreground/50">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
