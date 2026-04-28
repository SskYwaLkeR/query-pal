import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ConnectionConfig } from "@/types/connection";
import { getAppDb, initializeAppDb } from "./app-db";

const LEGACY_PATH = path.join(process.cwd(), "data", "connections.json");
let migrated = false;

async function ensureReady(): Promise<void> {
  await initializeAppDb();

  if (!migrated) {
    migrated = true;
    await seedDefault();
    await migrateFromJson();
  }
}

async function seedDefault(): Promise<void> {
  const db = getAppDb();
  const existing = await db.query(
    "SELECT id FROM connections WHERE id = $1",
    ["demo"]
  );
  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO connections (id, name, type, sqlite_path, is_default)
       VALUES ($1, $2, $3, $4, $5)`,
      ["demo", "Demo Database", "sqlite", "data/demo.db", true]
    );
  }
}

async function migrateFromJson(): Promise<void> {
  if (!fs.existsSync(LEGACY_PATH)) return;

  try {
    const raw = fs.readFileSync(LEGACY_PATH, "utf-8");
    const configs: ConnectionConfig[] = JSON.parse(raw);
    const db = getAppDb();

    for (const c of configs) {
      const exists = await db.query(
        "SELECT id FROM connections WHERE id = $1",
        [c.id]
      );
      if (exists.rows.length > 0) continue;

      await db.query(
        `INSERT INTO connections (id, name, type, sqlite_path, connection_string, is_default, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          c.id,
          c.name,
          c.type,
          c.sqlitePath || null,
          c.connectionString || null,
          c.isDefault || false,
          c.createdAt || new Date().toISOString(),
        ]
      );
    }

    fs.renameSync(LEGACY_PATH, LEGACY_PATH.replace(".json", ".json.migrated"));
  } catch {
    // migration is best-effort
  }
}

function rowToConfig(row: Record<string, unknown>): ConnectionConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as "sqlite" | "postgresql",
    sqlitePath: (row.sqlite_path as string) || undefined,
    connectionString: (row.connection_string as string) || undefined,
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
  const result = await db.query("SELECT * FROM connections WHERE id = $1", [
    id,
  ]);
  return result.rows.length > 0 ? rowToConfig(result.rows[0]) : null;
}

export async function addConnection(
  config: Omit<ConnectionConfig, "id" | "createdAt">
): Promise<ConnectionConfig> {
  await ensureReady();
  const db = getAppDb();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO connections (id, name, type, sqlite_path, connection_string, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      config.name,
      config.type,
      config.sqlitePath || null,
      config.connectionString || null,
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
  if (updates.type !== undefined) {
    fields.push(`type = $${idx++}`);
    values.push(updates.type);
  }
  if (updates.sqlitePath !== undefined) {
    fields.push(`sqlite_path = $${idx++}`);
    values.push(updates.sqlitePath || null);
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
  if (existing.rows.length === 0)
    throw new Error(`Connection ${id} not found`);
  if (existing.rows[0].is_default)
    throw new Error("Cannot delete the default connection");
  await db.query("DELETE FROM connections WHERE id = $1", [id]);
}
