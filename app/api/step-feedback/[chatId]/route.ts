// C:\Users\User\hume-voice-simulator\app\api\step-feedback\[chatId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStepFeedbacksByChat } from "@/lib/db/queries";

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const feedbacks = await getStepFeedbacksByChat(params.chatId);
    return NextResponse.json(feedbacks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get feedbacks" }, { status: 500 });
  }
}