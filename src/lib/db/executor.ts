import { DatabaseAdapter } from "./adapter";
import { QueryResult } from "@/types/query";

const MAX_ROWS = 100;

export async function executeQuery(
  adapter: DatabaseAdapter,
  sql: string
): Promise<QueryResult> {
  const limitedSQL = addLimitIfMissing(sql, MAX_ROWS + 1);

  const { columns, rows } = await adapter.query(limitedSQL);

  const truncated = rows.length > MAX_ROWS;
  const returnRows = truncated ? rows.slice(0, MAX_ROWS) : rows;

  return {
    columns: returnRows.length > 0 ? Object.keys(returnRows[0]) : columns,
    rows: returnRows,
    rowCount: returnRows.length,
    truncated,
  };
}

export function addLimitIfMissing(sql: string, limit: number): string {
  const normalized = sql.trim().replace(/;$/, "");
  const withoutSubqueries = removeParenthesizedBlocks(normalized);
  if (/\bLIMIT\b/i.test(withoutSubqueries)) {
    return normalized;
  }
  return `${normalized} LIMIT ${limit}`;
}

function removeParenthesizedBlocks(sql: string): string {
  let result = "";
  let depth = 0;
  for (const char of sql) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (depth === 0) result += char;
  }
  return result;
}
