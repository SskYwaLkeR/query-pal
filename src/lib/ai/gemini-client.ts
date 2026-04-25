import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMMessage } from "./providers";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (genAI) return genAI;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Required when AI_PROVIDER=gemini.");
  }
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

export async function callGemini(
  systemPrompt: string,
  messages: LLMMessage[]
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return text;
}
