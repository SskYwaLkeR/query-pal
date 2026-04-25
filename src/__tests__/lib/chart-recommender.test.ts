import { recommendChart } from "@/lib/viz/chart-recommender";

describe("recommendChart", () => {
  it("returns KPI for a single numeric value", () => {
    const result = recommendChart(
      ["count"],
      [{ count: 150 }],
      null
    );
    expect(result.type).toBe("kpi");
    expect(result.y_axis).toBe("count");
  });

  it("returns line chart for time-series data", () => {
    const rows = [
      { month: "2025-01", signups: 20 },
      { month: "2025-02", signups: 35 },
      { month: "2025-03", signups: 50 },
      { month: "2025-04", signups: 42 },
    ];
    const result = recommendChart(["month", "signups"], rows, null);
    expect(result.type).toBe("line");
    expect(result.x_axis).toBe("month");
    expect(result.y_axis).toBe("signups");
  });

  it("returns bar chart for categorical + numeric data", () => {
    const rows = [
      { country: "US", count: 56 },
      { country: "UK", count: 23 },
      { country: "Brazil", count: 18 },
      { country: "Germany", count: 12 },
    ];
    const result = recommendChart(["country", "count"], rows, null);
    expect(result.type).toBe("bar");
  });

  it("returns table for empty result sets", () => {
    const result = recommendChart(["id", "name"], [], null);
    expect(result.type).toBe("table");
  });

  it("uses LLM recommendation when compatible with data shape", () => {
    const rows = [
      { plan: "free", count: 40 },
      { plan: "starter", count: 30 },
      { plan: "pro", count: 20 },
    ];
    const llmRec = {
      type: "pie" as const,
      x_axis: "plan",
      y_axis: "count",
      title: "Revenue by Plan",
    };
    const result = recommendChart(["plan", "count"], rows, llmRec);
    expect(result.type).toBe("pie");
    expect(result.title).toBe("Revenue by Plan");
  });

  it("overrides LLM recommendation when incompatible (too many rows for pie)", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      category: `cat_${i}`,
      value: i * 10,
    }));
    const llmRec = {
      type: "pie" as const,
      x_axis: "category",
      y_axis: "value",
      title: "Distribution",
    };
    const result = recommendChart(["category", "value"], rows, llmRec);
    expect(result.type).toBe("bar");
  });

  it("overrides LLM recommendation when referenced columns don't exist", () => {
    const rows = [
      { name: "Alice", score: 90 },
      { name: "Bob", score: 85 },
    ];
    const llmRec = {
      type: "bar" as const,
      x_axis: "nonexistent_col",
      y_axis: "score",
      title: "Scores",
    };
    const result = recommendChart(["name", "score"], rows, llmRec);
    expect(result.type).toBe("bar");
    expect(result.x_axis).toBe("name");
  });
});
