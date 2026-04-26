import { ConnectionConfig } from "@/types/connection";
import { SchemaInfo } from "@/types/schema";
import { DatabaseAdapter } from "./adapter";
import { createAdapter } from "./adapter-factory";
import { getConnection } from "./connection-registry";

const adapters = new Map<string, DatabaseAdapter>();
const schemaCache = new Map<string, SchemaInfo>();

export async function getAdapter(connectionId: string): Promise<DatabaseAdapter> {
  const existing = adapters.get(connectionId);
  if (existing) return existing;

  const config = getConnection(connectionId);
  if (!config) {
    throw new Error(`Connection "${connectionId}" not found in registry`);
  }

  const adapter = createAdapter(config);
  adapters.set(connectionId, adapter);
  return adapter;
}

export async function getSchemaForConnection(
  connectionId: string
): Promise<SchemaInfo> {
  const cached = schemaCache.get(connectionId);
  if (cached) return cached;

  const adapter = await getAdapter(connectionId);
  const schema = await adapter.getSchema();
  schemaCache.set(connectionId, schema);
  return schema;
}

export function resetSchema(connectionId: string): void {
  schemaCache.delete(connectionId);
}

export async function removeAdapter(connectionId: string): Promise<void> {
  const adapter = adapters.get(connectionId);
  if (adapter) {
    await adapter.close();
    adapters.delete(connectionId);
  }
  schemaCache.delete(connectionId);
}

export async function testConnectionConfig(
  config: ConnectionConfig
): Promise<void> {
  const adapter = createAdapter(config);
  try {
    await adapter.testConnection();
  } finally {
    await adapter.close();
  }
}
