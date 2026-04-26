"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { QueryResult, ChartRecommendation } from "@/types/query";

interface BarChartViewProps {
  data: QueryResult;
  chart: ChartRecommendation;
}

export function BarChartView({ data, chart }: BarChartViewProps) {
  const xKey = chart.x_axis || data.columns[0];
  const yKey = chart.y_axis || data.columns[1];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.rows} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            angle={data.rows.length > 8 ? -45 : 0}
            textAnchor={data.rows.length > 8 ? "end" : "middle"}
            height={data.rows.length > 8 ? 60 : 30}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          />
          <Bar
            dataKey={yKey}
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
