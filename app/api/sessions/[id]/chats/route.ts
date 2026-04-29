// C:\Users\User\hume-voice-simulator\app\api\sessions\[id]\chats\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth'; // Updated to use authOptions
import { getChatsBySession } from "@/lib/db/queries";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await getChatsBySession(params.id);
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats for session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}