"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryResult, ChartRecommendation } from "@/types/query";
import { ChartRenderer } from "./chart-renderer";
import { DataTable } from "./data-table";
import { SQLDisplay } from "./sql-display";

interface ResultPanelProps {
  data?: QueryResult;
  chart?: ChartRecommendation;
  sql: string;
}

export function ResultPanel({ data, chart, sql }: ResultPanelProps) {
  const hasChart = !!chart && chart.type !== "table" && !!data;
  const defaultTab = hasChart ? "chart" : data ? "table" : "sql";

  return (
    <Tabs defaultValue={defaultTab} className="mt-3">
      <TabsList className="h-8">
        {hasChart && (
          <TabsTrigger value="chart" className="text-xs px-3 h-7">
            Visual
          </TabsTrigger>
        )}
        {data && (
          <TabsTrigger value="table" className="text-xs px-3 h-7">
            Data
          </TabsTrigger>
        )}
        <TabsTrigger value="sql" className="text-xs px-3 h-7">
          Query
        </TabsTrigger>
      </TabsList>

      {hasChart && (
        <TabsContent value="chart" className="mt-3">
          <ChartRenderer data={data!} chart={chart!} />
        </TabsContent>
      )}

      {data && (
        <TabsContent value="table" className="mt-3">
          <DataTable data={data} />
        </TabsContent>
      )}

      <TabsContent value="sql" className="mt-3">
        <SQLDisplay sql={sql} />
      </TabsContent>
    </Tabs>
  );
}
