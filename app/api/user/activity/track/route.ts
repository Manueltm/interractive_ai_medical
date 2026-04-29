import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { userActivity, userPerformance, application } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      applicationSlug,
      activityType,
      metadata,
      sessionId
    } = body;

    if (!applicationSlug || !activityType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the application ID from slug
    const apps = await db
      .select()
      .from(application)
      .where(eq(application.slug, applicationSlug));
    
    if (apps.length === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const applicationId = apps[0].id;

    // Record the activity
    await db.insert(userActivity).values({
      userId: session.user.id,
      applicationId,
      sessionId: sessionId || null,
      activityType,
      metadata: metadata || {},
    });

    // Update user_performance for session_complete
    if (activityType === 'session_complete' && metadata?.score !== undefined && metadata?.category) {
      await updateUserPerformance(
        session.user.id,
        applicationId,
        metadata.category,
        metadata.score,
        metadata.timeSpent || 0
      );
    }
    
    // Update user_performance for question_attempt
    if (activityType === 'question_attempt' && metadata?.category && metadata?.correct !== undefined) {
      await updateUserPerformanceForQuestion(
        session.user.id,
        applicationId,
        metadata.category,
        metadata.correct
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function updateUserPerformance(
  userId: string,
  applicationId: string,
  category: string,
  score: number,
  timeSpent: number
) {
  const existing = await db
    .select()
    .from(userPerformance)
    .where(
      and(
        eq(userPerformance.userId, userId),
        eq(userPerformance.applicationId, applicationId),
        eq(userPerformance.category, category)
      )
    );

  if (existing.length > 0) {
    const current = existing[0];
    // Use null coalescing to handle null values
    const currentTotalAttempts = current.totalAttempts ?? 0;
    const currentCorrectAttempts = current.correctAttempts ?? 0;
    const currentAverageScore = current.averageScore ?? 0;
    const currentTimeSpent = current.timeSpent ?? 0;
    
    const totalAttempts = currentTotalAttempts + 1;
    const correctAttempts = currentCorrectAttempts + (score >= 70 ? 1 : 0);
    const newAverageScore = (currentAverageScore * currentTotalAttempts + score) / totalAttempts;
    
    await db
      .update(userPerformance)
      .set({
        totalAttempts,
        correctAttempts,
        averageScore: newAverageScore,
        timeSpent: currentTimeSpent + timeSpent,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userPerformance.id, current.id));
  } else {
    await db.insert(userPerformance).values({
      userId,
      applicationId,
      category,
      totalAttempts: 1,
      correctAttempts: score >= 70 ? 1 : 0,
      averageScore: score,
      timeSpent,
      lastAttemptAt: new Date(),
    });
  }
}

async function updateUserPerformanceForQuestion(
  userId: string,
  applicationId: string,
  category: string,
  isCorrect: boolean
) {
  const existing = await db
    .select()
    .from(userPerformance)
    .where(
      and(
        eq(userPerformance.userId, userId),
        eq(userPerformance.applicationId, applicationId),
        eq(userPerformance.category, category)
      )
    );

  if (existing.length > 0) {
    const current = existing[0];
    // Use null coalescing to handle null values
    const currentTotalAttempts = current.totalAttempts ?? 0;
    const currentCorrectAttempts = current.correctAttempts ?? 0;
    const currentAverageScore = current.averageScore ?? 0;
    
    const totalAttempts = currentTotalAttempts + 1;
    const correctAttempts = currentCorrectAttempts + (isCorrect ? 1 : 0);
    const newAverageScore = (currentAverageScore * currentTotalAttempts + (isCorrect ? 100 : 0)) / totalAttempts;
    
    await db
      .update(userPerformance)
      .set({
        totalAttempts,
        correctAttempts,
        averageScore: newAverageScore,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userPerformance.id, current.id));
  } else {
    await db.insert(userPerformance).values({
      userId,
      applicationId,
      category,
      totalAttempts: 1,
      correctAttempts: isCorrect ? 1 : 0,
      averageScore: isCorrect ? 100 : 0,
      lastAttemptAt: new Date(),
    });
  }
}