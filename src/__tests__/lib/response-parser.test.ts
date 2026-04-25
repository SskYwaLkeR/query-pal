import { parseResponse } from "@/lib/ai/response-parser";

describe("parseResponse", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      sql: "SELECT COUNT(*) FROM customers",
      explanation: "Counting all customers",
      chart_recommendation: { type: "kpi", y_axis: "count", title: "Total Customers" },
      follow_up_suggestions: ["Break down by country", "Show monthly trend"],
      clarification_needed: false,
    });
    const result = parseResponse(raw);
    expect(result.sql).toBe("SELECT COUNT(*) FROM customers");
    expect(result.explanation).toBe("Counting all customers");
    expect(result.chart_recommendation?.type).toBe("kpi");
    expect(result.follow_up_suggestions).toHaveLength(2);
    expect(result.clarification_needed).toBe(false);
  });

  it("strips markdown code fences before parsing", () => {
    const raw = '```json\n{"sql": "SELECT 1", "explanation": "test"}\n```';
    const result = parseResponse(raw);
    expect(result.sql).toBe("SELECT 1");
    expect(result.explanation).toBe("test");
  });

  it("gracefully handles malformed JSON by treating as explanation", () => {
    const raw = "I'm sorry, I couldn't generate SQL for that query.";
    const result = parseResponse(raw);
    expect(result.sql).toBeNull();
    expect(result.explanation).toBe(raw);
    expect(result.follow_up_suggestions).toEqual([]);
    expect(result.clarification_needed).toBe(false);
  });

  it("handles clarification responses", () => {
    const raw = JSON.stringify({
      sql: null,
      explanation: null,
      clarification_needed: true,
      clarification_question: "Which revenue metric: MRR or total invoiced?",
      follow_up_suggestions: [],
    });
    const result = parseResponse(raw);
    expect(result.clarification_needed).toBe(true);
    expect(result.clarification_question).toBe("Which revenue metric: MRR or total invoiced?");
    expect(result.sql).toBeNull();
  });

  it("defaults missing fields safely", () => {
    const raw = JSON.stringify({ sql: "SELECT 1" });
    const result = parseResponse(raw);
    expect(result.sql).toBe("SELECT 1");
    expect(result.explanation).toBeNull();
    expect(result.chart_recommendation).toBeNull();
    expect(result.follow_up_suggestions).toEqual([]);
    expect(result.clarification_needed).toBe(false);
  });
});
