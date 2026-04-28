import { ConnectionConfig } from "@/types/connection";
import { DatabaseAdapter } from "./adapter";
import { PostgresAdapter } from "./adapters/postgres-adapter";

export function createAdapter(config: ConnectionConfig): DatabaseAdapter {
  if (!config.connectionString) {
    throw new Error(`Connection "${config.name}" has no connection string`);
  }
  return new PostgresAdapter(config.connectionString, config.schema);
}
