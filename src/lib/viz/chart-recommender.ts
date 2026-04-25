import { ChartRecommendation } from "@/types/query";

export function recommendChart(
  columns: string[],
  rows: Record<string, unknown>[],
  llmRecommendation: ChartRecommendation | null
): ChartRecommendation {
  // If LLM gave a recommendation and it's compatible, use it
  if (llmRecommendation && isCompatible(llmRecommendation, columns, rows)) {
    return llmRecommendation;
  }

  // Fallback heuristics
  if (rows.length === 0) {
    return { type: "table", title: "No results" };
  }

  // Single row, 1-2 columns with at least one numeric → KPI
  if (rows.length === 1 && columns.length <= 2) {
    const numericCol = columns.find(
      (c) => typeof rows[0][c] === "number"
    );
    if (numericCol) {
      return {
        type: "kpi",
        y_axis: numericCol,
        title: formatTitle(numericCol),
      };
    }
  }

  const numericCols = columns.filter((c) =>
    rows.some((r) => typeof r[c] === "number")
  );
  const textCols = columns.filter(
    (c) => !numericCols.includes(c)
  );
  const dateCols = columns.filter((c) => looksLikeDate(rows, c));

  // Time series: date column + numeric column, 3+ rows
  if (dateCols.length >= 1 && numericCols.length >= 1 && rows.length >= 3) {
    return {
      type: "line",
      x_axis: dateCols[0],
      y_axis: numericCols[0],
      title: `${formatTitle(numericCols[0])} over time`,
    };
  }

  // Bar chart: text + numeric, 2-15 rows
  if (
    textCols.length >= 1 &&
    numericCols.length >= 1 &&
    rows.length >= 2 &&
    rows.length <= 15
  ) {
    return {
      type: "bar",
      x_axis: textCols[0],
      y_axis: numericCols[0],
      title: `${formatTitle(numericCols[0])} by ${formatTitle(textCols[0])}`,
    };
  }

  // Pie chart: text + single numeric, 2-7 rows
  if (
    textCols.length >= 1 &&
    numericCols.length === 1 &&
    rows.length >= 2 &&
    rows.length <= 7
  ) {
    return {
      type: "pie",
      x_axis: textCols[0],
      y_axis: numericCols[0],
      title: `${formatTitle(numericCols[0])} distribution`,
    };
  }

  // Default to table
  return {
    type: "table",
    title: "Query Results",
  };
}

function isCompatible(
  rec: ChartRecommendation,
  columns: string[],
  rows: Record<string, unknown>[]
): boolean {
  if (rec.type === "table") return true;
  if (rec.type === "kpi" && rows.length === 1) return true;

  if (rec.x_axis && !columns.includes(rec.x_axis)) return false;
  if (rec.y_axis && !columns.includes(rec.y_axis)) return false;

  if (rec.type === "line" && rows.length < 3) return false;
  if (rec.type === "bar" && (rows.length < 2 || rows.length > 20)) return false;
  if (rec.type === "pie" && (rows.length < 2 || rows.length > 10)) return false;

  return true;
}

function looksLikeDate(
  rows: Record<string, unknown>[],
  column: string
): boolean {
  const datePattern = /^\d{4}-\d{2}(-\d{2})?$/;
  const sample = rows.slice(0, 5);
  return sample.every(
    (r) => typeof r[column] === "string" && datePattern.test(r[column] as string)
  );
}

function formatTitle(col: string): string {
  return col
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
