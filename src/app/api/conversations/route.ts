import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  createConversation,
} from "@/lib/db/conversation-repository";

export async function GET(request: NextRequest) {
  const databaseId = request.nextUrl.searchParams.get("databaseId");
  if (!databaseId) {
    return NextResponse.json(
      { error: "databaseId is required" },
      { status: 400 }
    );
  }

  const conversations = await listConversations(databaseId);
  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId, title } = body;

    if (!databaseId) {
      return NextResponse.json(
        { error: "databaseId is required" },
        { status: 400 }
      );
    }

    const conversation = await createConversation(databaseId, title);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
