// app/api/sessions/[id]/flashcard-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config"; // Add authConfig
import { getFlashcardHistoryBySession, saveFlashcardHistory } from "@/lib/db/queries";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const history = await getFlashcardHistoryBySession(params.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching flashcard history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig); // Add session check for POST too
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { departmentId, topic, question, answer } = await request.json();
    if (!departmentId || !topic || !question || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const history = await saveFlashcardHistory(params.id, departmentId, topic, question, answer);
    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    console.error("Error saving flashcard history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}