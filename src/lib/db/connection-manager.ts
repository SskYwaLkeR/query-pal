import { ConnectionConfig } from "@/types/connection";
import { SchemaInfo } from "@/types/schema";
import { DatabaseAdapter } from "./adapter";
import { createAdapter } from "./adapter-factory";
import { getConnection } from "./connection-registry";

const SCHEMA_CACHE_TTL_MS = parseInt(
  process.env.SCHEMA_CACHE_TTL_MS || "300000",
  10
);

const adapters = new Map<string, DatabaseAdapter>();

interface CachedSchema {
  schema: SchemaInfo;
  cachedAt: number;
}

const schemaCache = new Map<string, CachedSchema>();
const refreshing = new Set<string>();

export async function getAdapter(connectionId: string): Promise<DatabaseAdapter> {
  const existing = adapters.get(connectionId);
  if (existing) return existing;

  const config = await getConnection(connectionId);
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
  const now = Date.now();

  if (cached) {
    const age = now - cached.cachedAt;
    if (age < SCHEMA_CACHE_TTL_MS) {
      return cached.schema;
    }
    if (!refreshing.has(connectionId)) {
      refreshing.add(connectionId);
      refreshSchemaInBackground(connectionId);
    }
    return cached.schema;
  }

  const adapter = await getAdapter(connectionId);
  const schema = await adapter.getSchema();
  schemaCache.set(connectionId, { schema, cachedAt: now });
  return schema;
}

async function refreshSchemaInBackground(connectionId: string): Promise<void> {
  try {
    const adapter = await getAdapter(connectionId);
    const schema = await adapter.getSchema();
    schemaCache.set(connectionId, { schema, cachedAt: Date.now() });
  } catch {
    // stale data is better than no data
  } finally {
    refreshing.delete(connectionId);
  }
}

export function resetSchema(connectionId: string): void {
  schemaCache.delete(connectionId);
  refreshing.delete(connectionId);
}

export async function removeAdapter(connectionId: string): Promise<void> {
  const adapter = adapters.get(connectionId);
  if (adapter) {
    await adapter.close();
    adapters.delete(connectionId);
  }
  schemaCache.delete(connectionId);
  refreshing.delete(connectionId);
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
