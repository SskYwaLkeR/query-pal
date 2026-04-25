import { NextRequest, NextResponse } from "next/server";
import { getReadonlyDb } from "@/lib/db/connection";
import { getSchema } from "@/lib/db/schema-introspector";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getLLMProvider } from "@/lib/ai/providers";
import {
  buildMessagesForLLM,
  buildResultSummary,
} from "@/lib/ai/context-manager";
import { parseResponse } from "@/lib/ai/response-parser";
import { validateSQL } from "@/lib/sql/validator";
import { executeQuery } from "@/lib/db/executor";
import { recommendChart } from "@/lib/viz/chart-recommender";
import { ChatRequest, ChatResponse } from "@/types/chat";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { type: "error", message: "Message is required.", followUps: [] },
        { status: 400 }
      );
    }

    // 1. Get schema
    const db = getReadonlyDb();
    const schema = getSchema(db);
    const systemPrompt = buildSystemPrompt(schema.summary);

    // 2. Build messages with conversation context
    const { systemPrompt: system, messages } = buildMessagesForLLM(
      systemPrompt,
      conversationHistory || [],
      message
    );

    // 3. Call LLM (Claude or Gemini, based on AI_PROVIDER env)
    let llmRaw: string;
    try {
      const callLLM = getLLMProvider();
      llmRaw = await callLLM(system, messages);
    } catch (error) {
      db.close();
      const errMsg =
        error instanceof Error ? error.message : "Failed to call AI";
      return NextResponse.json({
        type: "error",
        message: `AI service error: ${errMsg}`,
        followUps: [],
      } satisfies ChatResponse);
    }

    // 4. Parse response
    const parsed = parseResponse(llmRaw);

    // 5. Handle clarification
    if (parsed.clarification_needed) {
      db.close();
      return NextResponse.json({
        type: "clarification",
        message: parsed.clarification_question ?? undefined,
        followUps: [],
      } satisfies ChatResponse);
    }

    // 6. If no SQL generated, return explanation as-is
    if (!parsed.sql) {
      db.close();
      return NextResponse.json({
        type: "error",
        message:
          parsed.explanation ||
          "I wasn't able to generate a query for that. Could you rephrase?",
        followUps: parsed.follow_up_suggestions,
      } satisfies ChatResponse);
    }

    // 7. Validate SQL
    const validation = validateSQL(parsed.sql);
    if (!validation.valid) {
      db.close();
      return NextResponse.json({
        type: "error",
        message: `Safety check failed: ${validation.error}`,
        sql: parsed.sql,
        followUps: [],
      } satisfies ChatResponse);
    }

    // 8. Execute SQL
    try {
      const result = executeQuery(db, parsed.sql);

      // 9. Determine chart type
      const chart = recommendChart(
        result.columns,
        result.rows,
        parsed.chart_recommendation
      );

      // 10. Build result summary for context
      const summary = buildResultSummary(
        result.columns,
        result.rows,
        parsed.sql
      );

      db.close();

      return NextResponse.json({
        type: "success",
        sql: parsed.sql,
        explanation: parsed.explanation ?? undefined,
        data: result,
        chart,
        followUps: parsed.follow_up_suggestions,
        resultSummary: summary,
      } satisfies ChatResponse);
    } catch (dbError) {
      db.close();
      const errMsg =
        dbError instanceof Error ? dbError.message : "Query execution failed";
      return NextResponse.json({
        type: "error",
        message: `Query failed: ${errMsg}. Try rephrasing your question.`,
        sql: parsed.sql ?? undefined,
        explanation: parsed.explanation ?? undefined,
        followUps: [
          "Show me all tables in the database",
          "How many customers do we have?",
        ],
      } satisfies ChatResponse);
    }
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { type: "error", message: errMsg, followUps: [] },
      { status: 500 }
    );
  }
}
