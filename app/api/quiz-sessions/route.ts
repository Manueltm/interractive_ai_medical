// app/api/quiz-sessions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { quizSession } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// POST - Create a new quiz session
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, totalQuestions } = body;

    if (!categoryId || !totalQuestions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new quiz session
    const [newSession] = await db
      .insert(quizSession)
      .values({
        userId: session.user.id,
        quizId: categoryId,
        totalQuestions: totalQuestions,
        correctAnswers: 0,
        wrongAnswers: 0,
      })
      .returning();

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Error creating quiz session:", error);
    return NextResponse.json(
      { error: "Failed to create quiz session" },
      { status: 500 }
    );
  }
}

// GET - Get user's quiz sessions
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let sessions;

    if (sessionId) {
      // Get specific session
      sessions = await db
        .select()
        .from(quizSession)
        .where(
          and(
            eq(quizSession.userId, session.user.id),
            eq(quizSession.id, sessionId)
          )
        );
    } else {
      // Get all sessions for user
      let query = db
        .select()
        .from(quizSession)
        .where(eq(quizSession.userId, session.user.id))
        .orderBy(desc(quizSession.createdAt));

      if (limit) {
        // Use type assertion to help TypeScript
        const limitedQuery = await (query as any).limit(limit);
        sessions = limitedQuery;
      } else {
        sessions = await query;
      }
    }

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching quiz sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz sessions" },
      { status: 500 }
    );
  }
}

// PUT - Update quiz session (for completing a session)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, correctAnswers, wrongAnswers, completed } = body;

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

    // Update session
    const updateData: any = {};
    
    if (correctAnswers !== undefined) {
      updateData.correctAnswers = correctAnswers;
    }
    
    if (wrongAnswers !== undefined) {
      updateData.wrongAnswers = wrongAnswers;
    }
    
    if (completed) {
      updateData.completedAt = new Date();
    }

    const [updatedSession] = await db
      .update(quizSession)
      .set(updateData)
      .where(eq(quizSession.id, sessionId))
      .returning();

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating quiz session:", error);
    return NextResponse.json(
      { error: "Failed to update quiz session" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a quiz session
export async function DELETE(request: Request) {
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

    await db
      .delete(quizSession)
      .where(eq(quizSession.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quiz session:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz session" },
      { status: 500 }
    );
  }
}