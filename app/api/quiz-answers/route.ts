// app/api/quiz-answers/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { quizAnswer, quizSession } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST - Save an answer
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, questionId, selectedAnswer, isCorrect } = body;

    if (!sessionId || !questionId || selectedAnswer === undefined || isCorrect === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const existingSession = await db
      .select()
      .from(quizSession)
      .where(
        and(
          eq(quizSession.id, sessionId),
          eq(quizSession.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Save the answer
    const [answer] = await db
      .insert(quizAnswer)
      .values({
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
      })
      .returning();

    // Update session stats
    if (isCorrect) {
      await db
        .update(quizSession)
        .set({
          correctAnswers: (existingSession[0].correctAnswers || 0) + 1
        })
        .where(eq(quizSession.id, sessionId));
    } else {
      await db
        .update(quizSession)
        .set({
          wrongAnswers: (existingSession[0].wrongAnswers || 0) + 1
        })
        .where(eq(quizSession.id, sessionId));
    }

    return NextResponse.json(answer);
  } catch (error) {
    console.error("Error saving quiz answer:", error);
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }
}

// GET - Get answers for a session
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const existingSession = await db
      .select()
      .from(quizSession)
      .where(
        and(
          eq(quizSession.id, sessionId),
          eq(quizSession.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const answers = await db
      .select()
      .from(quizAnswer)
      .where(eq(quizAnswer.sessionId, sessionId));

    return NextResponse.json(answers);
  } catch (error) {
    console.error("Error fetching quiz answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch answers" },
      { status: 500 }
    );
  }
}