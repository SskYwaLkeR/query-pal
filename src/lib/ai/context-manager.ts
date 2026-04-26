import { ConversationTurn } from "@/types/chat";
import { LLMMessage } from "./providers";

const MAX_HISTORY_TURNS = 10;

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
