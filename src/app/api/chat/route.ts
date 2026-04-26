import { NextRequest, NextResponse } from "next/server";
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
import {
  getAdapter,
  getSchemaForConnection,
} from "@/lib/db/connection-manager";
import { ChatRequest, ChatResponse } from "@/types/chat";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory, databaseId = "demo" } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { type: "error", message: "Message is required.", followUps: [] },
        { status: 400 }
      );
    }

    // 1. Get adapter and schema for the selected database
    const adapter = await getAdapter(databaseId);
    const schema = await getSchemaForConnection(databaseId);
    const systemPrompt = buildSystemPrompt(schema.summary, adapter.dialect);

    // 2. Build messages with conversation context
    const { systemPrompt: system, messages } = buildMessagesForLLM(
      systemPrompt,
      conversationHistory || [],
      message
    );

    // 3. Call LLM (with one retry if it fails to produce SQL)
    const callLLM = getLLMProvider();
    let parsed;
    for (let attempt = 0; attempt < 2; attempt++) {
      let llmRaw: string;
      try {
        const msgs =
          attempt === 0
            ? messages
            : [
                ...messages,
                {
                  role: "assistant" as const,
                  content: "Let me provide the correct JSON response.",
                },
                {
                  role: "user" as const,
                  content:
                    "You did not respond with valid JSON containing a sql field. You MUST respond with ONLY a raw JSON object like: {\"sql\": \"SELECT ...\", \"explanation\": \"...\", ...}. No prose, no markdown. Try again.",
                },
              ];
        llmRaw = await callLLM(system, msgs);
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Failed to call AI";
        return NextResponse.json({
          type: "error",
          message: `AI service error: ${errMsg}`,
          followUps: [],
        } satisfies ChatResponse);
      }

      parsed = parseResponse(llmRaw);

      if (parsed.clarification_needed || parsed.sql) break;
      if (attempt === 0) continue;
    }

    if (!parsed) {
      return NextResponse.json({
        type: "error",
        message: "I wasn't able to generate a query for that. Could you rephrase?",
        followUps: [],
      } satisfies ChatResponse);
    }

    // 5. Handle clarification
    if (parsed.clarification_needed) {
      return NextResponse.json({
        type: "clarification",
        message: parsed.clarification_question ?? undefined,
        followUps: [],
      } satisfies ChatResponse);
    }

    // 6. If no SQL generated after retries, return explanation
    if (!parsed.sql) {
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
      return NextResponse.json({
        type: "error",
        message: `Safety check failed: ${validation.error}`,
        sql: parsed.sql,
        followUps: [],
      } satisfies ChatResponse);
    }

    // 8. Execute SQL via adapter
    try {
      const result = await executeQuery(adapter, parsed.sql);

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
