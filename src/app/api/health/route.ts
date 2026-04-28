import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/app-db";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await getAppDb().query("SELECT 1");
    checks.database = "ok";
  } catch (err) {
    checks.database = err instanceof Error ? err.message : "error";
  }

  const aiProvider = process.env.AI_PROVIDER || "ollama";
  const aiConfigured =
    aiProvider === "ollama" ||
    (aiProvider === "gemini" && !!process.env.GOOGLE_API_KEY) ||
    (aiProvider === "claude" && !!process.env.ANTHROPIC_API_KEY);

  checks.ai = aiConfigured ? "ok" : `${aiProvider} key missing`;

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, version: process.env.npm_package_version || "unknown" },
    { status: allOk ? 200 : 503 }
  );
}
