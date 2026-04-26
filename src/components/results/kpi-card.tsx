"use client";

import { QueryResult, ChartRecommendation } from "@/types/query";

interface KPICardProps {
  data: QueryResult;
  chart: ChartRecommendation;
}

export function KPICard({ data, chart }: KPICardProps) {
  if (data.rows.length === 0) return null;

  const row = data.rows[0];
  const valueCol = chart.y_axis || data.columns[0];
  const rawValue = row[valueCol];
  const value =
    typeof rawValue === "number"
      ? rawValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : String(rawValue ?? "—");

  const label = chart.title || valueCol.replace(/_/g, " ");

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#f43f5e] to-[#6366f1] bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-2 capitalize">
        {label}
      </div>
    </div>
  );
}
