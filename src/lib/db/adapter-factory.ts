import { ConnectionConfig } from "@/types/connection";
import { DatabaseAdapter } from "./adapter";
import { SqliteAdapter } from "./adapters/sqlite-adapter";
import { PostgresAdapter } from "./adapters/postgres-adapter";

export function createAdapter(config: ConnectionConfig): DatabaseAdapter {
  switch (config.type) {
    case "sqlite": {
      if (!config.sqlitePath) {
        throw new Error(`SQLite connection "${config.name}" has no file path`);
      }
      return new SqliteAdapter(config.sqlitePath);
    }
    case "postgresql": {
      if (!config.connectionString) {
        throw new Error(
          `PostgreSQL connection "${config.name}" has no connection string`
        );
      }
      return new PostgresAdapter(config.connectionString);
    }
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
