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
    case "anthropic": {
      const { callClaude } = require("./claude-client");
      return callClaude;
    }
    case "gemini":
    case "google": {
      const { callGemini } = require("./gemini-client");
      return callGemini;
    }
    case "ollama":
    case "local": {
      const { callOllama } = require("./ollama-client");
      return callOllama;
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "claude", "gemini", or "ollama".`
      );
  }
}
