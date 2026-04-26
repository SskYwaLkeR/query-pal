import { Pool } from "pg";
import { DatabaseAdapter } from "../adapter";
import {
  ColumnInfo,
  Relationship,
  SchemaInfo,
  TableInfo,
} from "@/types/schema";

export class PostgresAdapter implements DatabaseAdapter {
  readonly dialect = "postgresql" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }

  async query(
    sql: string
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    const result = await this.pool.query(sql);
    const columns = result.fields.map((f) => f.name);
    return { columns, rows: result.rows };
  }

  async getSchema(): Promise<SchemaInfo> {
    const tablesResult = await this.pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tableNames = new Set(
      tablesResult.rows.map((r: { table_name: string }) => r.table_name)
    );
    const allTables: TableInfo[] = [];
    const allRelationships: Relationship[] = [];

    for (const { table_name: tableName } of tablesResult.rows) {
      const columnsResult = await this.pool.query(
        `SELECT
           c.column_name,
           c.data_type,
           c.is_nullable,
           CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
         FROM information_schema.columns c
         LEFT JOIN (
           SELECT ku.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage ku
             ON tc.constraint_name = ku.constraint_name
           WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
         ) pk ON pk.column_name = c.column_name
         WHERE c.table_schema = 'public' AND c.table_name = $1
         ORDER BY c.ordinal_position`,
        [tableName]
      );

      const fkResult = await this.pool.query(
        `SELECT
           kcu.column_name AS from_column,
           ccu.table_name AS to_table,
           ccu.column_name AS to_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'`,
        [tableName]
      );

      const fkMap = new Map(
        fkResult.rows.map((fk: { from_column: string; to_table: string; to_column: string }) => [
          fk.from_column,
          fk,
        ])
      );

      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      );
      const rowCount = parseInt(countResult.rows[0].count, 10);

      const sampleResult = await this.pool.query(
        `SELECT * FROM "${tableName}" LIMIT 3`
      );
      const sampleRows = sampleResult.rows;

      const columns: ColumnInfo[] = [];

      for (const col of columnsResult.rows) {
        const fk = fkMap.get(col.column_name);
        let sampleValues: string[] | undefined;
        let distinctValues: number | undefined;

        const isNumeric = ["integer", "bigint", "smallint", "numeric", "real", "double precision"].includes(col.data_type);

        if (!col.is_pk && !isNumeric) {
          const distinctResult = await this.pool.query(
            `SELECT COUNT(DISTINCT "${col.column_name}") as cnt FROM "${tableName}"`
          );
          distinctValues = parseInt(distinctResult.rows[0].cnt, 10);

          if (distinctValues <= 20 && distinctValues > 0) {
            const valuesResult = await this.pool.query(
              `SELECT DISTINCT "${col.column_name}" FROM "${tableName}"
               WHERE "${col.column_name}" IS NOT NULL
               ORDER BY "${col.column_name}" LIMIT 20`
            );
            sampleValues = valuesResult.rows.map((v: Record<string, unknown>) =>
              String(v[col.column_name])
            );
          }
        }

        let isForeignKey = !!fk;
        let foreignTable = fk?.to_table;
        let foreignColumn = fk?.to_column;

        if (!fk && col.column_name.endsWith("_id")) {
          const inferredTable = col.column_name.replace(/_id$/, "s");
          if (tableNames.has(inferredTable)) {
            isForeignKey = true;
            foreignTable = inferredTable;
            foreignColumn = "id";
          }
        }

        if (isForeignKey && foreignTable && foreignColumn) {
          allRelationships.push({
            fromTable: tableName,
            fromColumn: col.column_name,
            toTable: foreignTable,
            toColumn: foreignColumn,
          });
        }

        columns.push({
          name: col.column_name,
          type: col.data_type.toUpperCase(),
          nullable: col.is_nullable === "YES",
          isPrimaryKey: col.is_pk,
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
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
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
