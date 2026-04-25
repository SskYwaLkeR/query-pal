import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "data", "demo.db");
  db = new Database(dbPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getReadonlyDb(): Database.Database {
  const dbPath = path.join(process.cwd(), "data", "demo.db");
  const readonlyDb = new Database(dbPath, { readonly: true });
  readonlyDb.pragma("foreign_keys = ON");
  return readonlyDb;
}
