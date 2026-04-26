"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { QueryResult, ChartRecommendation } from "@/types/query";

interface PieChartViewProps {
  data: QueryResult;
  chart: ChartRecommendation;
}

const COLORS = [
  "#f43f5e",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function PieChartView({ data, chart }: PieChartViewProps) {
  const nameKey = chart.x_axis || data.columns[0];
  const valueKey = chart.y_axis || data.columns[1];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.rows}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={false}
          >
            {data.rows.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
