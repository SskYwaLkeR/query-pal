import { ChartRecommendation } from "@/types/query";

export interface ParsedResponse {
  sql: string | null;
  explanation: string | null;
  chart_recommendation: ChartRecommendation | null;
  follow_up_suggestions: string[];
  clarification_needed: boolean;
  clarification_question: string | null;
}

export function parseResponse(raw: string): ParsedResponse {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    return {
      sql: parsed.sql ?? null,
      explanation: parsed.explanation ?? null,
      chart_recommendation: parsed.chart_recommendation ?? null,
      follow_up_suggestions: Array.isArray(parsed.follow_up_suggestions)
        ? parsed.follow_up_suggestions
        : [],
      clarification_needed: parsed.clarification_needed === true,
      clarification_question: parsed.clarification_question ?? null,
    };
  } catch {
    // If JSON parsing fails, treat the entire response as an explanation
    return {
      sql: null,
      explanation: raw,
      chart_recommendation: null,
      follow_up_suggestions: [],
      clarification_needed: false,
      clarification_question: null,
    };
  }
}
