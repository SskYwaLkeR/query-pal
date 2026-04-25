import { addLimitIfMissing } from "@/lib/db/executor";

describe("addLimitIfMissing", () => {
  it("adds LIMIT to queries without one", () => {
    const result = addLimitIfMissing("SELECT * FROM customers", 101);
    expect(result).toBe("SELECT * FROM customers LIMIT 101");
  });

  it("preserves existing LIMIT", () => {
    const result = addLimitIfMissing("SELECT * FROM customers LIMIT 10", 101);
    expect(result).toBe("SELECT * FROM customers LIMIT 10");
  });

  it("preserves LIMIT inside subqueries while adding outer LIMIT", () => {
    const sql =
      "SELECT * FROM (SELECT * FROM customers LIMIT 5) sub";
    const result = addLimitIfMissing(sql, 101);
    expect(result).toBe(`${sql} LIMIT 101`);
  });

  it("strips trailing semicolons before adding LIMIT", () => {
    const result = addLimitIfMissing("SELECT * FROM customers;", 101);
    expect(result).toBe("SELECT * FROM customers LIMIT 101");
  });

  it("handles case-insensitive LIMIT detection", () => {
    const result = addLimitIfMissing("SELECT * FROM customers limit 50", 101);
    expect(result).toBe("SELECT * FROM customers limit 50");
  });
});
