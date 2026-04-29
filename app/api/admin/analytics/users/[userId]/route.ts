import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { userActivity, userPerformance, application, user } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all"; // all, week, month, year
    const appFilter = searchParams.get("app");

    // Get date filter
    let dateFilter = sql`1=1`;
    if (period !== "all") {
      const days = period === "week" ? 7 : period === "month" ? 30 : 365;
      dateFilter = sql`${userActivity.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`;
    }

    // 1. Get overall stats
    const overallStats = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalTimeSpent: sql<number>`COALESCE(SUM((${userActivity.metadata}->>'timeSpent')::int), 0)`,
        averageScore: sql<number>`COALESCE(AVG((${userActivity.metadata}->>'score')::float), 0)`,
        uniqueApps: sql<number>`COUNT(DISTINCT ${userActivity.applicationId})`,
      })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, "session_complete"),
          dateFilter
        )
      );

    // 2. Get performance by application
    const appPerformance = await db
      .select({
        applicationId: userPerformance.applicationId,
        applicationName: application.name,
        applicationIcon: application.icon,
        applicationColor: application.color,
        totalAttempts: sql<number>`SUM(${userPerformance.totalAttempts})`,
        correctAttempts: sql<number>`SUM(${userPerformance.correctAttempts})`,
        averageScore: sql<number>`AVG(${userPerformance.averageScore})`,
        totalTimeSpent: sql<number>`SUM(${userPerformance.timeSpent})`,
        lastAttemptAt: sql<Date>`MAX(${userPerformance.lastAttemptAt})`,
      })
      .from(userPerformance)
      .innerJoin(application, eq(application.id, userPerformance.applicationId))
      .where(
        and(
          eq(userPerformance.userId, userId),
          appFilter ? eq(application.slug, appFilter) : sql`1=1`
        )
      )
      .groupBy(userPerformance.applicationId, application.name, application.icon, application.color)
      .orderBy(desc(sql`SUM(${userPerformance.totalAttempts})`));

    // 3. Get performance by category (strengths/weaknesses)
    // Replace the entire categoryPerformance query with:
const categoryPerformance = await db
  .select({
    category: userPerformance.category,
    totalAttempts: sql<number>`SUM(${userPerformance.totalAttempts})`,
    correctAttempts: sql<number>`SUM(${userPerformance.correctAttempts})`,
    averageScore: sql<number>`AVG(${userPerformance.averageScore})`,
    successRate: sql<number>`(SUM(${userPerformance.correctAttempts})::float / NULLIF(SUM(${userPerformance.totalAttempts}), 0)) * 100`,
  })
  .from(userPerformance)
  .where(
    and(
      eq(userPerformance.userId, userId),
      sql`${userPerformance.category} IS NOT NULL`  // Fixed this line
    )
  )
  .groupBy(userPerformance.category)
  .orderBy(desc(sql`(SUM(${userPerformance.correctAttempts})::float / NULLIF(SUM(${userPerformance.totalAttempts}), 0))`));

    // 4. Get recent activity
    const recentActivity = await db
      .select({
        id: userActivity.id,
        activityType: userActivity.activityType,
        metadata: userActivity.metadata,
        createdAt: userActivity.createdAt,
        applicationName: application.name,
        applicationIcon: application.icon,
      })
      .from(userActivity)
      .innerJoin(application, eq(application.id, userActivity.applicationId))
      .where(
        and(
          eq(userActivity.userId, userId),
          dateFilter
        )
      )
      .orderBy(desc(userActivity.createdAt))
      .limit(20);

    // 5. Get user info
    const userInfo = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId));

    // 6. Identify weak areas (categories with < 60% success rate and > 5 attempts)
    const weakAreas = categoryPerformance
      .filter(cat => cat.successRate < 60 && cat.totalAttempts > 5)
      .sort((a, b) => a.successRate - b.successRate);

    // 7. Identify strong areas (categories with > 80% success rate and > 5 attempts)
    const strongAreas = categoryPerformance
      .filter(cat => cat.successRate >= 80 && cat.totalAttempts > 5)
      .sort((a, b) => b.successRate - a.successRate);

    // 8. Generate recommendations
    const recommendations = generateRecommendations(weakAreas, strongAreas, appPerformance);

    return NextResponse.json({
      user: userInfo[0],
      overallStats: overallStats[0] || { totalSessions: 0, totalTimeSpent: 0, averageScore: 0, uniqueApps: 0 },
      appPerformance,
      categoryPerformance,
      recentActivity,
      weakAreas,
      strongAreas,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function generateRecommendations(weakAreas: any[], strongAreas: any[], appPerformance: any[]) {
  const recommendations = [];

  if (weakAreas.length > 0) {
    recommendations.push({
      type: "improvement",
      title: "Areas Needing Improvement",
      description: `Focus on improving in: ${weakAreas.map(w => w.category).join(", ")}. These areas have success rates below 60%.`,
      priority: "high",
    });
  }

  if (strongAreas.length > 0) {
    recommendations.push({
      type: "strength",
      title: "Strong Areas to Leverage",
      description: `You excel in: ${strongAreas.map(s => s.category).join(", ")}. Use these strengths to build confidence.`,
      priority: "medium",
    });
  }

  // Find least used apps
  const leastUsedApps = appPerformance
    .filter(app => app.totalAttempts < 5)
    .slice(0, 3);

  if (leastUsedApps.length > 0) {
    recommendations.push({
      type: "engagement",
      title: "Underutilized Applications",
      description: `Spend more time on: ${leastUsedApps.map(a => a.applicationName).join(", ")}. More practice will improve your skills.`,
      priority: "medium",
    });
  }

  // Overall performance recommendation
  const totalAvgScore = appPerformance.reduce((sum, app) => sum + (app.averageScore || 0), 0) / (appPerformance.length || 1);
  if (totalAvgScore < 70) {
    recommendations.push({
      type: "general",
      title: "General Performance",
      description: "Your overall performance needs improvement. Consider daily practice sessions of at least 30 minutes.",
      priority: "high",
    });
  } else if (totalAvgScore > 85) {
    recommendations.push({
      type: "general",
      title: "Excellent Progress",
      description: "Great job! You're performing well. Challenge yourself with more difficult questions.",
      priority: "low",
    });
  }

  return recommendations;
}