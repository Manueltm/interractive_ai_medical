// C:\Users\User\hume-voice-simulator\app\api\chats\[id]\session\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionByChatId } from '@/lib/db/queries';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const chatId = params.id;
  try {
    const session = await getSessionByChatId(chatId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}