import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { gameSession, gameAnswer, game } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// POST - Start a new game session
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gameId, totalQuestions } = body;

    if (!gameId || !totalQuestions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new game session
    const [newSession] = await db
      .insert(gameSession)
      .values({
        userId: session.user.id,
        gameId,
        totalQuestions,
        correctAnswers: 0,
        wrongAnswers: 0,
        score: 0
      })
      .returning();

    // Update total plays counter
    await db
      .update(game)
      .set({
        totalPlays: sql`${game.totalPlays} + 1`
      })
      .where(eq(game.id, gameId));

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Error creating game session:", error);
    return NextResponse.json(
      { error: "Failed to create game session" },
      { status: 500 }
    );
  }
}

// PUT - Update game session (submit answer or complete game)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, action, data } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const existingSession = await db
      .select()
      .from(gameSession)
      .where(
        and(
          eq(gameSession.id, sessionId),
          eq(gameSession.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (action === 'submitAnswer') {
      // Submit an answer
      const { questionId, userAnswer, isCorrect, timeSpent } = data;

      // Save answer
      const [answer] = await db
        .insert(gameAnswer)
        .values({
          sessionId,
          questionId,
          userAnswer,
          isCorrect,
          timeSpent
        })
        .returning();

      // Update session stats
      const updates: any = {};
      if (isCorrect) {
        updates.correctAnswers = (existingSession[0].correctAnswers || 0) + 1;
      } else {
        updates.wrongAnswers = (existingSession[0].wrongAnswers || 0) + 1;
      }
      
      // Calculate score (e.g., 100 points per correct answer)
      updates.score = (existingSession[0].score || 0) + (isCorrect ? 100 : 0);

      await db
        .update(gameSession)
        .set(updates)
        .where(eq(gameSession.id, sessionId));

      return NextResponse.json(answer);
    } 
    else if (action === 'complete') {
      // Complete the game
      const { timeTaken } = data;
      
      const [completed] = await db
        .update(gameSession)
        .set({
          completedAt: new Date(),
          timeTaken
        })
        .where(eq(gameSession.id, sessionId))
        .returning();

      return NextResponse.json(completed);
    }
    else if (action === 'restart') {
      // Restart the game (reset session)
      const [restarted] = await db
        .update(gameSession)
        .set({
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          completedAt: null,
          timeTaken: null
        })
        .where(eq(gameSession.id, sessionId))
        .returning();

      // Delete previous answers
      await db
        .delete(gameAnswer)
        .where(eq(gameAnswer.sessionId, sessionId));

      return NextResponse.json(restarted);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating game session:", error);
    return NextResponse.json(
      { error: "Failed to update game session" },
      { status: 500 }
    );
  }
}

// GET - Get session results
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

    // Get session with answers and questions
    const sessionData = await db
      .select()
      .from(gameSession)
      .where(
        and(
          eq(gameSession.id, sessionId),
          eq(gameSession.userId, session.user.id)
        )
      )
      .limit(1);

    if (sessionData.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const answers = await db
      .select()
      .from(gameAnswer)
      .where(eq(gameAnswer.sessionId, sessionId))
      .orderBy(gameAnswer.createdAt);

    return NextResponse.json({
      session: sessionData[0],
      answers
    });
  } catch (error) {
    console.error("Error fetching game session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}