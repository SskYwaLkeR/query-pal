"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryResult, ChartRecommendation } from "@/types/query";
import { ChartRenderer } from "./chart-renderer";
import { DataTable } from "./data-table";
import { SQLDisplay } from "./sql-display";

interface ResultPanelProps {
  data: QueryResult;
  chart: ChartRecommendation;
  sql: string;
}

export function ResultPanel({ data, chart, sql }: ResultPanelProps) {
  const defaultTab = chart.type === "table" ? "table" : "chart";

  return (
    <Tabs defaultValue={defaultTab} className="mt-3">
      <TabsList className="h-8">
        {chart.type !== "table" && (
          <TabsTrigger value="chart" className="text-xs px-3 h-7">
            Chart
          </TabsTrigger>
        )}
        <TabsTrigger value="table" className="text-xs px-3 h-7">
          Table
        </TabsTrigger>
        <TabsTrigger value="sql" className="text-xs px-3 h-7">
          SQL
        </TabsTrigger>
      </TabsList>
      {chart.type !== "table" && (
        <TabsContent value="chart" className="mt-3">
          <ChartRenderer data={data} chart={chart} />
        </TabsContent>
      )}
      <TabsContent value="table" className="mt-3">
        <DataTable data={data} />
      </TabsContent>
      <TabsContent value="sql" className="mt-3">
        <SQLDisplay sql={sql} />
      </TabsContent>
    </Tabs>
  );
}
