import { NextResponse } from "next/server";
import { getReadonlyDb } from "@/lib/db/connection";
import { getSchema } from "@/lib/db/schema-introspector";

export async function GET() {
  try {
    const db = getReadonlyDb();
    const schema = getSchema(db);
    db.close();
    return NextResponse.json(schema);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load schema";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
