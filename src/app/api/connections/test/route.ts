import { NextRequest, NextResponse } from "next/server";
import { testConnectionConfig } from "@/lib/db/connection-manager";
import { ConnectionConfig } from "@/types/connection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sqlitePath, connectionString } = body;

    const tempConfig: ConnectionConfig = {
      id: "test",
      name: "test",
      type,
      sqlitePath,
      connectionString,
      createdAt: new Date().toISOString(),
    };

    await testConnectionConfig(tempConfig);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
