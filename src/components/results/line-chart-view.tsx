"use client";

import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { QueryResult, ChartRecommendation } from "@/types/query";

interface LineChartViewProps {
  data: QueryResult;
  chart: ChartRecommendation;
}

export function LineChartView({ data, chart }: LineChartViewProps) {
  const xKey = chart.x_axis || data.columns[0];
  const yKey = chart.y_axis || data.columns[1];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.rows} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
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
          <Area
            type="monotone"
            dataKey={yKey}
            fill="url(#lineAreaGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#f43f5e"
            strokeWidth={2}
            dot={{ fill: "#f43f5e", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
