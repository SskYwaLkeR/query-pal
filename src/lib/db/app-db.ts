import { Pool } from "pg";

let pool: Pool | null = null;
let initialized = false;

export function getAppDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.APP_DATABASE_URL ||
        "postgresql://localhost:5432/querypal",
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function initializeAppDb(): Promise<void> {
  if (initialized) return;

  const db = getAppDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL CHECK (type IN ('sqlite', 'postgresql')),
      sqlite_path       TEXT,
      connection_string TEXT,
      is_default        BOOLEAN DEFAULT false,
      created_at        TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,
      database_id TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT 'New conversation',
      created_at  TIMESTAMPTZ DEFAULT now(),
      updated_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content         TEXT NOT NULL DEFAULT '',
      sql             TEXT,
      chart           JSONB,
      follow_ups      JSONB,
      type            TEXT NOT NULL DEFAULT 'success',
      result_summary  TEXT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_database ON conversations(database_id, updated_at DESC);
  `);

  initialized = true;
}
