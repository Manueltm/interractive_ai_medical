import { NextRequest, NextResponse } from "next/server";
import { saveFlashcardHistory } from "@/lib/db/queries";

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { departmentId, topic, question, answer } = await request.json();
    if (!departmentId || !topic || !question || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const history = await saveFlashcardHistory(params.sessionId, departmentId, topic, question, answer);
    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    console.error("Error saving flashcard history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}