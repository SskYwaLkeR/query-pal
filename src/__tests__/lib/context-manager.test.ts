import {
  buildResultSummary,
  buildMessagesForClaude,
} from "@/lib/ai/context-manager";

describe("buildResultSummary", () => {
  it("includes all values for small result sets (<=5 rows)", () => {
    const summary = buildResultSummary(
      ["country", "count"],
      [
        { country: "US", count: 56 },
        { country: "UK", count: 23 },
      ],
      "SELECT country, COUNT(*) as count FROM customers GROUP BY country"
    );
    expect(summary).toContain("2 row(s)");
    expect(summary).toContain("country=US");
    expect(summary).toContain("country=UK");
  });

  it("summarizes large result sets with top result and totals", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `Customer ${i}`,
      revenue: (i + 1) * 100,
    }));
    const summary = buildResultSummary(
      ["name", "revenue"],
      rows,
      "SELECT name, revenue FROM customers"
    );
    expect(summary).toContain("10 row(s)");
    expect(summary).toContain("Top result");
    expect(summary).toContain("Total revenue: 5500");
  });

  it("includes the SQL used", () => {
    const sql = "SELECT COUNT(*) as total FROM orders";
    const summary = buildResultSummary(
      ["total"],
      [{ total: 400 }],
      sql
    );
    expect(summary).toContain(`SQL used: ${sql}`);
  });
});

describe("buildMessagesForClaude", () => {
  it("includes system prompt with cache control", () => {
    const { system } = buildMessagesForClaude("You are a DB assistant", [], "hello");
    expect(system[0].text).toBe("You are a DB assistant");
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("appends current message as the last user message", () => {
    const { messages } = buildMessagesForClaude("system", [], "What tables exist?");
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("What tables exist?");
  });

  it("includes conversation history with SQL and result summaries", () => {
    const history = [
      { role: "user" as const, content: "How many customers?" },
      {
        role: "assistant" as const,
        content: "There are 150 customers.",
        sql: "SELECT COUNT(*) FROM customers",
        resultSummary: "1 row. count=150.",
      },
    ];
    const { messages } = buildMessagesForClaude("system", history, "Break down by country");
    expect(messages).toHaveLength(3);
    expect(messages[1].content).toContain("SQL executed:");
    expect(messages[1].content).toContain("Result: 1 row");
    expect(messages[2].content).toBe("Break down by country");
  });

  it("truncates history to last 20 messages (10 turns)", () => {
    const longHistory = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}`,
    }));
    const { messages } = buildMessagesForClaude("system", longHistory, "next question");
    // 20 from history + 1 current = 21
    expect(messages).toHaveLength(21);
  });
});
