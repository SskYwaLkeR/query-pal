import { Pool, PoolClient } from "pg";
import { DatabaseAdapter, QUERY_TIMEOUT_MS, QueryTimeoutError } from "../adapter";
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
    const client = await this.pool.connect();
    try {
      await client.query(`SET statement_timeout = '${QUERY_TIMEOUT_MS}'`);
      const result = await client.query(sql);
      const columns = result.fields.map((f) => f.name);
      return { columns, rows: result.rows };
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("canceling statement due to statement timeout")
      ) {
        throw new QueryTimeoutError();
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async getSchema(): Promise<SchemaInfo> {
    const [allColumnsResult, allFksResult, allCountsResult] = await Promise.all([
      this.pool.query(
        `SELECT
           c.table_name,
           c.column_name,
           c.data_type,
           c.is_nullable,
           c.ordinal_position,
           CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
         FROM information_schema.columns c
         LEFT JOIN (
           SELECT tc.table_name, ku.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage ku
             ON tc.constraint_name = ku.constraint_name
           WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
         ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
         WHERE c.table_schema = 'public'
           AND c.table_name IN (
             SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           )
         ORDER BY c.table_name, c.ordinal_position`
      ),
      this.pool.query(
        `SELECT
           tc.table_name AS from_table,
           kcu.column_name AS from_column,
           ccu.table_name AS to_table,
           ccu.column_name AS to_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'`
      ),
      this.pool.query(
        `SELECT relname AS table_name, n_live_tup AS count
         FROM pg_stat_user_tables
         WHERE schemaname = 'public'`
      ),
    ]);

    const tableNames = new Set<string>();
    const columnsByTable = new Map<string, Array<{
      column_name: string; data_type: string; is_nullable: string; is_pk: boolean;
    }>>();

    for (const row of allColumnsResult.rows) {
      tableNames.add(row.table_name);
      let cols = columnsByTable.get(row.table_name);
      if (!cols) {
        cols = [];
        columnsByTable.set(row.table_name, cols);
      }
      cols.push(row);
    }

    const fksByTable = new Map<string, Map<string, { to_table: string; to_column: string }>>();
    for (const row of allFksResult.rows) {
      let fks = fksByTable.get(row.from_table);
      if (!fks) {
        fks = new Map();
        fksByTable.set(row.from_table, fks);
      }
      fks.set(row.from_column, { to_table: row.to_table, to_column: row.to_column });
    }

    const rowCounts = new Map<string, number>();
    for (const row of allCountsResult.rows) {
      rowCounts.set(row.table_name, parseInt(row.count, 10));
    }

    const NUMERIC_TYPES = new Set(["integer", "bigint", "smallint", "numeric", "real", "double precision"]);
    const LARGE_TABLE_THRESHOLD = 10_000;

    const allTables: TableInfo[] = [];
    const allRelationships: Relationship[] = [];

    const samplePromises = Array.from(tableNames).map(async (tableName) => {
      const result = await this.pool.query(`SELECT * FROM "${tableName}" LIMIT 3`);
      return { tableName, rows: result.rows };
    });
    const sampleResults = await Promise.all(samplePromises);
    const samplesByTable = new Map(sampleResults.map((s) => [s.tableName, s.rows]));

    for (const tableName of tableNames) {
      const colRows = columnsByTable.get(tableName) || [];
      const fkMap = fksByTable.get(tableName) || new Map();
      const rowCount = rowCounts.get(tableName) || 0;
      const sampleRows = samplesByTable.get(tableName) || [];
      const isLargeTable = rowCount > LARGE_TABLE_THRESHOLD;

      const columns: ColumnInfo[] = [];

      for (const col of colRows) {
        const fk = fkMap.get(col.column_name);
        let sampleValues: string[] | undefined;
        let distinctValues: number | undefined;

        const isNumeric = NUMERIC_TYPES.has(col.data_type);

        if (!col.is_pk && !isNumeric && !isLargeTable) {
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

    allTables.sort((a, b) => a.name.localeCompare(b.name));

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
