import { callClaude } from "./claude-client";
import { callGemini } from "./gemini-client";
import { callOllama } from "./ollama-client";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export type CallLLM = (
  systemPrompt: string,
  messages: LLMMessage[]
) => Promise<string>;

export function getLLMProvider(): CallLLM {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  switch (provider) {
    case "claude":
    case "anthropic":
      return callClaude;
    case "gemini":
    case "google":
      return callGemini;
    case "ollama":
    case "local":
      return callOllama;
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "claude", "gemini", or "ollama".`
      );
  }
}
