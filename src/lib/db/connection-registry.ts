import { v4 as uuidv4 } from "uuid";
import { ConnectionConfig } from "@/types/connection";
import { getAppDb, initializeAppDb } from "./app-db";

let ready = false;

async function ensureReady(): Promise<void> {
  if (ready) return;
  await initializeAppDb();
  ready = true;
}

function rowToConfig(row: Record<string, unknown>): ConnectionConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    type: "postgresql",
    connectionString: (row.connection_string as string) || undefined,
    schema: (row.schema as string) || undefined,
    isDefault: row.is_default as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function loadConnections(): Promise<ConnectionConfig[]> {
  await ensureReady();
  const db = getAppDb();
  const result = await db.query(
    "SELECT * FROM connections ORDER BY created_at"
  );
  return result.rows.map(rowToConfig);
}

export async function getConnection(
  id: string
): Promise<ConnectionConfig | null> {
  await ensureReady();
  const db = getAppDb();
  const result = await db.query(
    "SELECT * FROM connections WHERE id = $1",
    [id]
  );
  return result.rows.length > 0 ? rowToConfig(result.rows[0]) : null;
}

export async function addConnection(
  config: Omit<ConnectionConfig, "id" | "createdAt">
): Promise<ConnectionConfig> {
  await ensureReady();
  const db = getAppDb();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO connections (id, name, type, connection_string, schema, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      config.name,
      "postgresql",
      config.connectionString || null,
      config.schema || null,
      config.isDefault || false,
    ]
  );
  return rowToConfig(result.rows[0]);
}

export async function updateConnection(
  id: string,
  updates: Partial<Omit<ConnectionConfig, "id" | "createdAt">>
): Promise<ConnectionConfig> {
  await ensureReady();
  const db = getAppDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.connectionString !== undefined) {
    fields.push(`connection_string = $${idx++}`);
    values.push(updates.connectionString || null);
  }
  if (updates.isDefault !== undefined) {
    fields.push(`is_default = $${idx++}`);
    values.push(updates.isDefault);
  }

  if (fields.length === 0) {
    const existing = await getConnection(id);
    if (!existing) throw new Error(`Connection ${id} not found`);
    return existing;
  }

  values.push(id);
  const result = await db.query(
    `UPDATE connections SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) throw new Error(`Connection ${id} not found`);
  return rowToConfig(result.rows[0]);
}

export async function deleteConnection(id: string): Promise<void> {
  await ensureReady();
  const db = getAppDb();
  const existing = await db.query(
    "SELECT is_default FROM connections WHERE id = $1",
    [id]
  );
  if (existing.rows.length === 0) throw new Error(`Connection ${id} not found`);
  if (existing.rows[0].is_default)
    throw new Error("Cannot delete the default connection");
  await db.query("DELETE FROM connections WHERE id = $1", [id]);
}
