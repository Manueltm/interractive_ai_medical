// C:\Users\User\hume-voice-simulator\app\api\chats/incomplete\route.ts 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getIncompleteChatByUser } from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const incomplete = await getIncompleteChatByUser(session.user.id);
    return NextResponse.json(incomplete);
  } catch (error) {
    console.error("Error fetching incomplete chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
