//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\chats\[id]\session\route.ts
import { NextResponse } from "next/server";
import { getSessionByChatId } from "@/lib/db/queries";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionByChatId(params.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session by chat ID:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}