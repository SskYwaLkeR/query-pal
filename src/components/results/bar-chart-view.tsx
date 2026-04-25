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
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar
            dataKey={yKey}
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
