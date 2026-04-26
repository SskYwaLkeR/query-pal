import { NextRequest, NextResponse } from "next/server";
import { getSchemaForConnection } from "@/lib/db/connection-manager";

export async function GET(request: NextRequest) {
  try {
    const databaseId =
      request.nextUrl.searchParams.get("databaseId") || "demo";
    const schema = await getSchemaForConnection(databaseId);
    return NextResponse.json(schema);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load schema";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
