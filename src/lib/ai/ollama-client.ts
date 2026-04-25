import { LLMMessage } from "./providers";

const DEFAULT_MODEL = "qwen2.5-coder:14b";
const DEFAULT_HOST = "http://localhost:11434";

export async function callOllama(
  systemPrompt: string,
  messages: LLMMessage[]
): Promise<string> {
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  const host = process.env.OLLAMA_HOST || DEFAULT_HOST;

  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.1,
        num_ctx: 8192,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Ollama request failed (${response.status}): ${body}. Is Ollama running? Try: ollama serve`
    );
  }

  const data = await response.json();
  const text = data.message?.content;

  if (!text) {
    throw new Error("No text response from Ollama");
  }

  return text;
}
