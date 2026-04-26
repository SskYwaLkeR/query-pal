import Database from "better-sqlite3";
import path from "path";
import { DatabaseAdapter } from "../adapter";
import {
  ColumnInfo,
  Relationship,
  SchemaInfo,
  TableInfo,
} from "@/types/schema";

interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

interface PragmaForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
}

export class SqliteAdapter implements DatabaseAdapter {
  readonly dialect = "sqlite" as const;
  private db: Database.Database;

  constructor(filePath: string) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    this.db = new Database(resolved, { readonly: true });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  async query(
    sql: string
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    const rows = this.db.prepare(sql).all() as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows };
  }

  async getSchema(): Promise<SchemaInfo> {
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as Array<{ name: string }>;

    const tableNames = new Set(tables.map((t) => t.name));
    const allTables: TableInfo[] = [];
    const allRelationships: Relationship[] = [];

    for (const { name: tableName } of tables) {
      const pragmaColumns = this.db
        .prepare(`PRAGMA table_info("${tableName}")`)
        .all() as PragmaTableInfo[];

      const foreignKeys = this.db
        .prepare(`PRAGMA foreign_key_list("${tableName}")`)
        .all() as PragmaForeignKey[];

      const fkMap = new Map(foreignKeys.map((fk) => [fk.from, fk]));

      const rowCount = (
        this.db
          .prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
          .get() as { count: number }
      ).count;

      const sampleRows = this.db
        .prepare(`SELECT * FROM "${tableName}" LIMIT 3`)
        .all() as Record<string, unknown>[];

      const columns: ColumnInfo[] = [];

      for (const col of pragmaColumns) {
        const fk = fkMap.get(col.name);
        let sampleValues: string[] | undefined;
        let distinctValues: number | undefined;

        if (
          !col.pk &&
          !col.type.includes("INTEGER") &&
          !col.type.includes("REAL")
        ) {
          const distinct = this.db
            .prepare(
              `SELECT COUNT(DISTINCT "${col.name}") as cnt FROM "${tableName}"`
            )
            .get() as { cnt: number };

          distinctValues = distinct.cnt;

          if (distinct.cnt <= 20 && distinct.cnt > 0) {
            const values = this.db
              .prepare(
                `SELECT DISTINCT "${col.name}" FROM "${tableName}" WHERE "${col.name}" IS NOT NULL ORDER BY "${col.name}" LIMIT 20`
              )
              .all() as Array<Record<string, unknown>>;
            sampleValues = values.map((v) => String(v[col.name]));
          }
        }

        let isForeignKey = !!fk;
        let foreignTable = fk?.table;
        let foreignColumn = fk?.to;

        if (!fk && col.name.endsWith("_id")) {
          const inferredTable = col.name.replace(/_id$/, "s");
          if (tableNames.has(inferredTable)) {
            isForeignKey = true;
            foreignTable = inferredTable;
            foreignColumn = "id";
          }
        }

        if (isForeignKey && foreignTable && foreignColumn) {
          allRelationships.push({
            fromTable: tableName,
            fromColumn: col.name,
            toTable: foreignTable,
            toColumn: foreignColumn,
          });
        }

        columns.push({
          name: col.name,
          type: col.type || "TEXT",
          nullable: col.notnull === 0,
          isPrimaryKey: col.pk === 1,
          isForeignKey,
          foreignTable,
          foreignColumn,
          distinctValues,
          sampleValues,
        });
      }

      allTables.push({ name: tableName, columns, rowCount, sampleRows });
    }

    const summary = buildSchemaSummary(allTables, allRelationships);
    return { tables: allTables, relationships: allRelationships, summary };
  }

  async testConnection(): Promise<void> {
    this.db.prepare("SELECT 1").get();
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

function buildSchemaSummary(
  tables: TableInfo[],
  relationships: Relationship[]
): string {
  const parts: string[] = ["DATABASE SCHEMA:", ""];

  for (const table of tables) {
    parts.push(`Table: ${table.name} (${table.rowCount} rows)`);
    for (const col of table.columns) {
      let desc = `  - ${col.name}: ${col.type}`;
      if (col.isPrimaryKey) desc += " PRIMARY KEY";
      if (col.isForeignKey && col.foreignTable) {
        desc += ` → ${col.foreignTable}.${col.foreignColumn}`;
      }
      if (col.sampleValues && col.sampleValues.length > 0) {
        desc += ` (values: ${col.sampleValues.join(", ")})`;
      }
      parts.push(desc);
    }
    parts.push("");
  }

  if (relationships.length > 0) {
    parts.push("RELATIONSHIPS:");
    for (const rel of relationships) {
      parts.push(
        `  - ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (many-to-one)`
      );
    }
    parts.push("");
  }

  return parts.join("\n");
}
