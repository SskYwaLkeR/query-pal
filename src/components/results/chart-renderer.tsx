"use client";

import { QueryResult, ChartRecommendation } from "@/types/query";
import { KPICard } from "./kpi-card";
import { BarChartView } from "./bar-chart-view";
import { LineChartView } from "./line-chart-view";
import { PieChartView } from "./pie-chart-view";
import { DataTable } from "./data-table";

interface ChartRendererProps {
  data: QueryResult;
  chart: ChartRecommendation;
}

export function ChartRenderer({ data, chart }: ChartRendererProps) {
  switch (chart.type) {
    case "kpi":
      return <KPICard data={data} chart={chart} />;
    case "bar":
      return <BarChartView data={data} chart={chart} />;
    case "line":
      return <LineChartView data={data} chart={chart} />;
    case "pie":
      return <PieChartView data={data} chart={chart} />;
    case "table":
    default:
      return <DataTable data={data} />;
  }
}
