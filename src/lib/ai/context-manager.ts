import { ConversationTurn } from "@/types/chat";
import { SchemaInfo, TableInfo, Relationship } from "@/types/schema";
import { LLMMessage } from "./providers";

const MAX_HISTORY_TURNS = 10;
const MAX_SCHEMA_TOKENS = 4000;
const PRUNE_THRESHOLD_TOKENS = 3000;
const CHARS_PER_TOKEN = 4;

export function buildResultSummary(
  columns: string[],
  rows: Record<string, unknown>[],
  sql: string
): string {
  const parts: string[] = [];
  parts.push(`Query returned ${rows.length} row(s).`);

  if (columns.length > 0) {
    parts.push(`Columns: ${columns.join(", ")}.`);
  }

  if (rows.length > 0 && rows.length <= 5) {
    for (const row of rows) {
      const vals = columns.map((c) => `${c}=${row[c]}`).join(", ");
      parts.push(`  ${vals}`);
    }
  } else if (rows.length > 5) {
    const firstRow = rows[0];
    const vals = columns.map((c) => `${c}=${firstRow[c]}`).join(", ");
    parts.push(`Top result: ${vals}`);

    for (const col of columns) {
      const values = rows.map((r) => r[col]);
      if (values.every((v) => typeof v === "number")) {
        const sum = values.reduce((a: number, b) => a + (b as number), 0);
        parts.push(`Total ${col}: ${sum}`);
      }
    }
  }

  parts.push(`SQL used: ${sql}`);
  return parts.join(" ");
}

export function buildMessagesForLLM(
  systemPrompt: string,
  history: ConversationTurn[],
  currentMessage: string
): { systemPrompt: string; messages: LLMMessage[] } {
  const truncatedHistory = history.slice(-MAX_HISTORY_TURNS * 2);

  const messages: LLMMessage[] = [];

  for (const turn of truncatedHistory) {
    if (turn.role === "user") {
      messages.push({ role: "user", content: turn.content });
    } else {
      let assistantContent = turn.content;
      if (turn.sql) {
        assistantContent += `\n\nSQL executed: ${turn.sql}`;
      }
      if (turn.resultSummary) {
        assistantContent += `\nResult: ${turn.resultSummary}`;
      }
      messages.push({ role: "assistant", content: assistantContent });
    }
  }

  messages.push({
    role: "user",
    content: `${currentMessage}\n\nRemember: respond with ONLY raw JSON, no markdown, no explanation outside JSON.`,
  });

  return { systemPrompt, messages };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function findRelevantTables(
  tables: TableInfo[],
  userMessage: string,
  history: ConversationTurn[]
): Set<string> {
  const relevant = new Set<string>();
  const allText = [
    userMessage,
    ...history.slice(-6).map((t) => t.content),
  ]
    .join(" ")
    .toLowerCase();

  for (const table of tables) {
    const nameVariants = [
      table.name.toLowerCase(),
      table.name.replace(/_/g, " ").toLowerCase(),
      table.name.replace(/_/g, "").toLowerCase(),
    ];
    if (nameVariants.some((v) => allText.includes(v))) {
      relevant.add(table.name);
    }
    for (const col of table.columns) {
      const colName = col.name.replace(/_/g, " ").toLowerCase();
      if (allText.includes(colName) && colName.length > 3) {
        relevant.add(table.name);
        break;
      }
    }
  }

  for (const table of tables) {
    if (!relevant.has(table.name)) continue;
    for (const col of table.columns) {
      if (col.foreignTable && tables.some((t) => t.name === col.foreignTable)) {
        relevant.add(col.foreignTable);
      }
    }
  }

  return relevant;
}

function buildCompactTableLine(table: TableInfo): string {
  const cols = table.columns.map((c) => c.name).join(", ");
  return `Table: ${table.name} (${table.rowCount} rows) — columns: ${cols}`;
}

function buildDetailedTableBlock(
  table: TableInfo,
  relationships: Relationship[]
): string {
  const parts: string[] = [];
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
  return parts.join("\n");
}

export function pruneSchemaForContext(
  schema: SchemaInfo,
  userMessage: string,
  history: ConversationTurn[]
): string {
  if (estimateTokens(schema.summary) <= PRUNE_THRESHOLD_TOKENS) {
    return schema.summary;
  }

  const relevant = findRelevantTables(schema.tables, userMessage, history);

  const parts: string[] = ["DATABASE SCHEMA:", ""];

  if (relevant.size === 0) {
    parts.push(
      `This database has ${schema.tables.length} tables. Ask about a specific table or topic for detailed column info.`
    );
    parts.push("");
  }

  for (const table of schema.tables) {
    if (relevant.has(table.name)) {
      parts.push(buildDetailedTableBlock(table, schema.relationships));
    } else {
      parts.push(buildCompactTableLine(table));
    }
    parts.push("");
  }

  const rels = schema.relationships.filter(
    (r) => relevant.has(r.fromTable) || relevant.has(r.toTable)
  );
  if (rels.length > 0) {
    parts.push("RELATIONSHIPS:");
    for (const rel of rels) {
      parts.push(
        `  - ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (many-to-one)`
      );
    }
    parts.push("");
  }

  let result = parts.join("\n");
  const maxChars = MAX_SCHEMA_TOKENS * CHARS_PER_TOKEN;
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + "\n... (schema truncated, ask about specific tables)";
  }

  return result;
}
