export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface ChartRecommendation {
  type: "bar" | "line" | "pie" | "table" | "kpi";
  x_axis?: string;
  y_axis?: string;
  title: string;
}
