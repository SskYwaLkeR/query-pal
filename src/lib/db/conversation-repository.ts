import { v4 as uuidv4 } from "uuid";
import { getAppDb, initializeAppDb } from "./app-db";
import { Conversation } from "@/types/conversation";
import { Message } from "@/types/chat";

export async function createConversation(
  databaseId: string,
  title: string = "New conversation"
): Promise<Conversation> {
  await initializeAppDb();
  const db = getAppDb();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO conversations (id, database_id, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, databaseId, title]
  );
  return rowToConversation(result.rows[0]);
}

export async function listConversations(
  databaseId: string
): Promise<Conversation[]> {
  await initializeAppDb();
  const db = getAppDb();
  const result = await db.query(
    `SELECT * FROM conversations
     WHERE database_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [databaseId]
  );
  return result.rows.map(rowToConversation);
}

export async function getConversationWithMessages(
  id: string
): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  await initializeAppDb();
  const db = getAppDb();

  const convResult = await db.query(
    "SELECT * FROM conversations WHERE id = $1",
    [id]
  );
  if (convResult.rows.length === 0) return null;

  const msgResult = await db.query(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at",
    [id]
  );

  return {
    conversation: rowToConversation(convResult.rows[0]),
    messages: msgResult.rows.map(rowToMessage),
  };
}

export async function deleteConversation(id: string): Promise<void> {
  await initializeAppDb();
  const db = getAppDb();
  await db.query("DELETE FROM conversations WHERE id = $1", [id]);
}

export async function updateConversationTitle(
  id: string,
  title: string
): Promise<Conversation> {
  await initializeAppDb();
  const db = getAppDb();
  const result = await db.query(
    `UPDATE conversations SET title = $1, updated_at = now()
     WHERE id = $2 RETURNING *`,
    [title, id]
  );
  if (result.rows.length === 0)
    throw new Error(`Conversation ${id} not found`);
  return rowToConversation(result.rows[0]);
}

export async function addMessage(
  conversationId: string,
  msg: {
    role: "user" | "assistant";
    content: string;
    sql?: string;
    chart?: Record<string, unknown>;
    data?: Record<string, unknown>;
    followUps?: string[];
    type?: string;
    resultSummary?: string;
  }
): Promise<string> {
  await initializeAppDb();
  const db = getAppDb();
  const id = uuidv4();

  await db.query(
    `INSERT INTO messages (id, conversation_id, role, content, sql, chart, result_data, follow_ups, type, result_summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      conversationId,
      msg.role,
      msg.content,
      msg.sql || null,
      msg.chart ? JSON.stringify(msg.chart) : null,
      msg.data ? JSON.stringify(msg.data) : null,
      msg.followUps ? JSON.stringify(msg.followUps) : null,
      msg.type || "success",
      msg.resultSummary || null,
    ]
  );

  await db.query(
    "UPDATE conversations SET updated_at = now() WHERE id = $1",
    [conversationId]
  );

  return id;
}

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    databaseId: row.database_id as string,
    title: row.title as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    role: row.role as "user" | "assistant",
    content: (row.content as string) || "",
    sql: (row.sql as string) || undefined,
    chart: (row.chart as Message["chart"]) || undefined,
    data: (row.result_data as Message["data"]) || undefined,
    followUps: (row.follow_ups as string[]) || undefined,
    type: (row.type as Message["type"]) || "success",
    resultSummary: (row.result_summary as string) || undefined,
  };
}
