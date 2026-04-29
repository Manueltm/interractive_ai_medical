// C:\Users\User\hume-voice-simulator\app\api\step-feedback\route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveStepFeedback } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const { chatId, stepIndex, feedback } = await req.json();
  try {
    await saveStepFeedback(chatId, stepIndex, feedback);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}