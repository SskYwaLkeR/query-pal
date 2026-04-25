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
  const cleaned = raw.trim();

  // Try parsing strategies in order of specificity
  const json =
    tryDirectParse(cleaned) ??
    tryCodeFenceParse(cleaned) ??
    tryBraceParse(cleaned);

  if (json) {
    return {
      sql: json.sql ?? null,
      explanation: json.explanation ?? null,
      chart_recommendation: json.chart_recommendation ?? null,
      follow_up_suggestions: Array.isArray(json.follow_up_suggestions)
        ? json.follow_up_suggestions
        : [],
      clarification_needed: json.clarification_needed === true,
      clarification_question: json.clarification_question ?? null,
    };
  }

  // All parsing failed — treat the entire response as an explanation
  return {
    sql: null,
    explanation: raw,
    chart_recommendation: null,
    follow_up_suggestions: [],
    clarification_needed: false,
    clarification_question: null,
  };
}

function tryDirectParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tryCodeFenceParse(text: string): Record<string, unknown> | null {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function tryBraceParse(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  // Find the matching closing brace by counting depth
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.substring(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
