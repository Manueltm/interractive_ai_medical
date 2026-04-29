// app\api\chats\[id]\route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getChatById, deleteChatById, deleteSessionById , updateChat } from "@/lib/db/queries";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const chatData = await getChatById(params.id);
    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json(chatData);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const chat = await getChatById(params.id);
    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized or chat not found" }, { status: 401 });
    }

    // 1. delete the linked session (if any)
    if (chat.sessionId) await deleteSessionById(chat.sessionId);

    // 2. delete the chat itself
    const deleted = await deleteChatById(params.id);
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// app/api/chats/[id]/route.ts - add PATCH handler for vapiCallId
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const chat = await getChatById(params.id);
    
    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized or chat not found" }, { status: 401 });
    }
    
    // Allow updating vapiCallId
    const updated = await updateChat(params.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}