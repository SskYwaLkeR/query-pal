import { format } from "sql-formatter";

export function formatSQL(
  sql: string,
  dialect: "sqlite" | "postgresql" = "sqlite"
): string {
  try {
    return format(sql, {
      language: dialect === "postgresql" ? "postgresql" : "sqlite",
      tabWidth: 2,
      keywordCase: "upper",
    });
  } catch {
    return sql;
  }
}
