import { SchemaInfo } from "@/types/schema";

export const QUERY_TIMEOUT_MS = 10_000;

export class QueryTimeoutError extends Error {
  constructor() {
    super(
      "This query took too long. Try adding filters to narrow down the results."
    );
    this.name = "QueryTimeoutError";
  }
}

export interface DatabaseAdapter {
  readonly dialect: "sqlite" | "postgresql";

  query(
    sql: string
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;

  getSchema(): Promise<SchemaInfo>;

  testConnection(): Promise<void>;

  close(): Promise<void>;
}
