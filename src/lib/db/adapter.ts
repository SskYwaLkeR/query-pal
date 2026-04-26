import { SchemaInfo } from "@/types/schema";

export interface DatabaseAdapter {
  readonly dialect: "sqlite" | "postgresql";

  query(
    sql: string
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;

  getSchema(): Promise<SchemaInfo>;

  testConnection(): Promise<void>;

  close(): Promise<void>;
}
