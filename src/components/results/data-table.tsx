"use client";

import { QueryResult } from "@/types/query";

interface DataTableProps {
  data: QueryResult;
}

function humanizeColumn(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DataTable({ data }: DataTableProps) {
  if (data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No results found.
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-80 rounded-xl border border-border/50 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                className="text-left px-4 py-2.5 font-medium text-muted-foreground border-b whitespace-nowrap"
              >
                {humanizeColumn(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              {data.columns.map((col) => (
                <td key={col} className="px-4 py-2 whitespace-nowrap">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20 border-t">
          Showing first {data.rowCount} results. Ask me to narrow down the data if you need something more specific.
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}
