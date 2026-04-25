import { validateSQL } from "@/lib/sql/validator";

describe("validateSQL", () => {
  it("allows basic SELECT queries", () => {
    const result = validateSQL("SELECT * FROM customers");
    expect(result.valid).toBe(true);
  });

  it("allows CTE queries starting with WITH", () => {
    const result = validateSQL(
      "WITH active AS (SELECT * FROM customers WHERE status = 'active') SELECT * FROM active"
    );
    expect(result.valid).toBe(true);
  });

  it("blocks INSERT statements", () => {
    const result = validateSQL("INSERT INTO customers (name) VALUES ('test')");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Only SELECT");
  });

  it("blocks UPDATE statements", () => {
    const result = validateSQL("UPDATE customers SET name = 'hacked'");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Only SELECT");
  });

  it("blocks DROP TABLE", () => {
    const result = validateSQL("DROP TABLE customers");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Only SELECT");
  });

  it("blocks DELETE statements", () => {
    const result = validateSQL("DELETE FROM customers WHERE id = 1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Only SELECT");
  });

  it("does not false-positive on column names containing blocked words", () => {
    const result = validateSQL(
      "SELECT deletion_date, created_at, updated_at FROM logs"
    );
    expect(result.valid).toBe(true);
  });

  it("blocks multiple statements (SQL injection attempt)", () => {
    const result = validateSQL(
      "SELECT * FROM customers; DROP TABLE customers"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("blocks keywords in string literals (conservative security)", () => {
    const result = validateSQL(
      "SELECT * FROM customers WHERE name = 'test; DROP TABLE'"
    );
    expect(result.valid).toBe(false);
  });

  it("allows semicolons inside string literals when no blocked keywords", () => {
    const result = validateSQL(
      "SELECT * FROM customers WHERE name = 'hello; world'"
    );
    expect(result.valid).toBe(true);
  });

  it("rejects empty queries", () => {
    const result = validateSQL("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Empty");
  });

  it("allows trailing semicolons on single statements", () => {
    const result = validateSQL("SELECT COUNT(*) FROM customers;");
    expect(result.valid).toBe(true);
  });
});
