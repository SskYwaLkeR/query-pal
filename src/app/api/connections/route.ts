import { NextRequest, NextResponse } from "next/server";
import {
  loadConnections,
  addConnection,
} from "@/lib/db/connection-registry";

export async function GET() {
  const connections = await loadConnections();
  const safe = connections.map((c) => ({
    ...c,
    connectionString: c.connectionString ? maskConnectionString(c.connectionString) : undefined,
  }));
  return NextResponse.json(safe);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, sqlitePath, connectionString } = body;

    if (!name?.trim() || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (type === "sqlite" && !sqlitePath?.trim()) {
      return NextResponse.json(
        { error: "SQLite file path is required" },
        { status: 400 }
      );
    }

    if (type === "postgresql" && !connectionString?.trim()) {
      return NextResponse.json(
        { error: "PostgreSQL connection string is required" },
        { status: 400 }
      );
    }

    const config = await addConnection({
      name: name.trim(),
      type,
      sqlitePath: sqlitePath?.trim(),
      connectionString: connectionString?.trim(),
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create connection";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function maskConnectionString(cs: string): string {
  try {
    const url = new URL(cs);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    return "****";
  }
}
