import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { getLLMProvider } from "@/lib/ai/providers";
import {
  buildMessagesForLLM,
  buildResultSummary,
  pruneSchemaForContext,
} from "@/lib/ai/context-manager";
import { parseResponse } from "@/lib/ai/response-parser";
import { validateSQL } from "@/lib/sql/validator";
import { executeQuery } from "@/lib/db/executor";
import { recommendChart } from "@/lib/viz/chart-recommender";
import {
  getAdapter,
  getSchemaForConnection,
} from "@/lib/db/connection-manager";
import { QueryTimeoutError } from "@/lib/db/adapter";
import { ChatRequest, ChatResponse } from "@/types/chat";
import {
  createConversation,
  addMessage,
} from "@/lib/db/conversation-repository";

async function persistAndRespond(
  conversationId: string | undefined,
  response: ChatResponse
): Promise<NextResponse> {
  if (conversationId) {
    await addMessage(conversationId, {
      role: "assistant",
      content: response.explanation || response.message || "",
      sql: response.sql,
      chart: response.chart as Record<string, unknown> | undefined,
      data: response.data as Record<string, unknown> | undefined,
      followUps: response.followUps,
      type: response.type,
      resultSummary: response.resultSummary,
    }).catch(() => {});
  }
  return NextResponse.json({ ...response, conversationId });
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory, databaseId = "demo" } = body;
    let { conversationId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { type: "error", message: "Message is required.", followUps: [] },
        { status: 400 }
      );
    }

    if (!conversationId) {
      const title =
        message.trim().length > 50
          ? message.trim().slice(0, 47) + "..."
          : message.trim();
      const conv = await createConversation(databaseId, title);
      conversationId = conv.id;
    }

    await addMessage(conversationId, {
      role: "user",
      content: message.trim(),
      type: "success",
    });

    const adapter = await getAdapter(databaseId);
    const schema = await getSchemaForConnection(databaseId);
    const schemaSummary = pruneSchemaForContext(
      schema,
      message,
      conversationHistory || []
    );
    const systemPrompt = buildSystemPrompt(schemaSummary, adapter.dialect);

    const { systemPrompt: system, messages } = buildMessagesForLLM(
      systemPrompt,
      conversationHistory || [],
      message
    );

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
                    'You did not respond with valid JSON containing a sql field. You MUST respond with ONLY a raw JSON object like: {"sql": "SELECT ...", "explanation": "...", ...}. No prose, no markdown. Try again.',
                },
              ];
        llmRaw = await callLLM(system, msgs);
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Failed to call AI";
        return persistAndRespond(conversationId, {
          type: "error",
          message: `AI service error: ${errMsg}`,
          followUps: [],
        });
      }

      parsed = parseResponse(llmRaw);

      if (parsed.clarification_needed || parsed.sql) break;
      if (attempt === 0) continue;
    }

    if (!parsed) {
      return persistAndRespond(conversationId, {
        type: "error",
        message:
          "I wasn't able to generate a query for that. Could you rephrase?",
        followUps: [],
      });
    }

    if (parsed.clarification_needed) {
      return persistAndRespond(conversationId, {
        type: "clarification",
        message: parsed.clarification_question ?? undefined,
        followUps: [],
      });
    }

    if (!parsed.sql) {
      if (parsed.explanation) {
        return persistAndRespond(conversationId, {
          type: "info",
          message: parsed.explanation,
          followUps: parsed.follow_up_suggestions,
        });
      }
      return persistAndRespond(conversationId, {
        type: "error",
        message: "I wasn't able to generate a query for that. Could you rephrase?",
        followUps: [],
      });
    }

    const validation = validateSQL(parsed.sql);
    if (!validation.valid) {
      return persistAndRespond(conversationId, {
        type: "error",
        message: `Safety check failed: ${validation.error}`,
        sql: parsed.sql,
        followUps: [],
      });
    }

    let lastSql = parsed.sql;
    let lastExplanation = parsed.explanation;
    for (let execAttempt = 0; execAttempt < 2; execAttempt++) {
      try {
        const result = await executeQuery(adapter, lastSql);

        const chart = recommendChart(
          result.columns,
          result.rows,
          parsed.chart_recommendation
        );

        const summary = buildResultSummary(
          result.columns,
          result.rows,
          lastSql
        );

        return persistAndRespond(conversationId, {
          type: "success",
          sql: lastSql,
          explanation: lastExplanation ?? undefined,
          data: result,
          chart,
          followUps: parsed.follow_up_suggestions,
          resultSummary: summary,
        });
      } catch (dbError) {
        if (dbError instanceof QueryTimeoutError) {
          return persistAndRespond(conversationId, {
            type: "error",
            message: dbError.message,
            sql: lastSql ?? undefined,
            explanation: lastExplanation ?? undefined,
            followUps: [
              "Try a simpler version of this query",
              "Add a date filter to narrow results",
            ],
          });
        }

        const errMsg =
          dbError instanceof Error
            ? dbError.message
            : "Query execution failed";

        const isColumnError =
          /column .* does not exist|relation .* does not exist|no such column|no such table/i.test(
            errMsg
          );

        if (execAttempt === 0 && isColumnError) {
          try {
            const correctionMessages = [
              ...messages,
              { role: "assistant" as const, content: JSON.stringify(parsed) },
              {
                role: "user" as const,
                content: `The SQL you generated failed with this database error: "${errMsg}". Check the schema carefully — primary keys are named "id", not "table_id". Foreign keys like "customer_id" exist on the REFERENCING table (e.g., orders.customer_id), not on the referenced table (customers.id). Fix the query and respond with ONLY the corrected JSON.`,
              },
            ];
            const retryRaw = await callLLM(system, correctionMessages);
            const retryParsed = parseResponse(retryRaw);
            if (retryParsed.sql) {
              const retryValidation = validateSQL(retryParsed.sql);
              if (retryValidation.valid) {
                lastSql = retryParsed.sql;
                lastExplanation = retryParsed.explanation;
                continue;
              }
            }
          } catch {
            // retry failed, fall through
          }
        }

        return persistAndRespond(conversationId, {
          type: "error",
          message: `Query failed: ${errMsg}. Try rephrasing your question.`,
          sql: lastSql ?? undefined,
          explanation: lastExplanation ?? undefined,
          followUps: [
            "Show me all tables in the database",
            "How many customers do we have?",
          ],
        });
      }
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
