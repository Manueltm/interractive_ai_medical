//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\user\analytics\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { userActivity, userPerformance, application } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week"; // week, month, all

    // Get date filter for user_activity only
    let activityDateFilter = sql`1=1`;
    if (period === "week") {
      activityDateFilter = sql`${userActivity.createdAt} >= NOW() - INTERVAL '7 days'`;
    } else if (period === "month") {
      activityDateFilter = sql`${userActivity.createdAt} >= NOW() - INTERVAL '30 days'`;
    }

    // For user_performance, we don't use date filter as it's cumulative
    // but we'll only show categories with attempts

    // 1. Get overall stats from user_activity
    const overallStats = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalTimeSpent: sql<number>`COALESCE(SUM((${userActivity.metadata}->>'timeSpent')::int), 0)`,
        averageScore: sql<number>`COALESCE(AVG((${userActivity.metadata}->>'score')::float), 0)`,
        recentScore: sql<number>`COALESCE(MAX((${userActivity.metadata}->>'score')::float), 0)`,
      })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, "session_complete"),
          activityDateFilter
        )
      );

    // 2. Get performance by category from user_performance (no date filter needed)
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
          sql`${userPerformance.category} IS NOT NULL`
        )
      )
      .groupBy(userPerformance.category)
      .having(sql`SUM(${userPerformance.totalAttempts}) > 3`);

    // 3. Get recent activity
    const recentActivity = await db
      .select({
        id: userActivity.id,
        activityType: userActivity.activityType,
        metadata: userActivity.metadata,
        createdAt: userActivity.createdAt,
        applicationName: application.name,
      })
      .from(userActivity)
      .innerJoin(application, eq(application.id, userActivity.applicationId))
      .where(
        and(
          eq(userActivity.userId, userId),
          activityDateFilter
        )
      )
      .orderBy(desc(userActivity.createdAt))
      .limit(5);

    // 4. Get streak data from user_activity
    const streakData = await getUserStreak(userId);

    // 5. Generate personalized recommendations
    const weakAreas = (categoryPerformance || [])
      .filter(cat => cat.successRate !== null && cat.successRate < 60)
      .sort((a, b) => (a.successRate || 0) - (b.successRate || 0))
      .slice(0, 3);

    const strongAreas = (categoryPerformance || [])
      .filter(cat => cat.successRate !== null && cat.successRate >= 70)
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, 3);

    const recommendations = generatePersonalizedRecommendations(
      weakAreas,
      strongAreas,
      overallStats[0] || null,
      streakData.streakDays
    );

    return NextResponse.json({
      overallStats: overallStats[0] || { totalSessions: 0, totalTimeSpent: 0, averageScore: 0, recentScore: 0 },
      weakAreas,
      strongAreas,
      recentActivity: recentActivity || [],
      streakData,
      recommendations,
      showInsights: shouldShowInsights(overallStats[0], weakAreas, strongAreas),
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function getUserStreak(userId: string) {
  // Get activity for last 30 days
  const activities = await db
    .select({
      createdAt: userActivity.createdAt,
    })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        sql`${userActivity.createdAt} >= NOW() - INTERVAL '30 days'`
      )
    )
    .orderBy(desc(userActivity.createdAt));

  // Calculate current streak
  let streakDays = 0;
  let lastDate: Date | null = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const activity of activities) {
    const activityDate = new Date(activity.createdAt);
    activityDate.setHours(0, 0, 0, 0);
    
    if (!lastDate) {
      // Check if activity is today or yesterday
      const diffDays = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        streakDays = 1;
        lastDate = activityDate;
      } else {
        break;
      }
    } else {
      const expectedDate = new Date(lastDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      if (activityDate.getTime() === expectedDate.getTime()) {
        streakDays++;
        lastDate = activityDate;
      } else {
        break;
      }
    }
  }

  return { streakDays, lastActivity: activities[0]?.createdAt || null };
}

function shouldShowInsights(stats: any, weakAreas: any[], strongAreas: any[]) {
  // Show insights if:
  // - User has completed at least 3 sessions
  // - Has weak areas identified
  // - Or has a streak going
  return (stats?.totalSessions >= 3) || weakAreas.length > 0 || strongAreas.length > 0;
}

function generatePersonalizedRecommendations(weakAreas: any[], strongAreas: any[], stats: any, streakDays: number) {
  const recommendations = [];

  if (weakAreas.length > 0) {
    recommendations.push({
      type: "improvement",
      title: "📚 Focus Areas",
      description: `Improve in: ${weakAreas.slice(0, 2).map(w => w.category).join(", ")}`,
      action: "practice",
    });
  }

  if (stats && stats.averageScore < 70 && stats.totalSessions > 2) {
    recommendations.push({
      type: "motivation",
      title: "💪 Keep Going!",
      description: "Consistent practice will improve your scores. Aim for 30 minutes daily.",
      action: "practice",
    });
  }

  if (streakDays > 2) {
    recommendations.push({
      type: "achievement",
      title: `🔥 ${streakDays} Day Streak!`,
      description: "Great consistency! Keep the momentum going.",
      action: "celebrate",
    });
  } else if (streakDays === 1) {
    recommendations.push({
      type: "motivation",
      title: "✨ Great Start!",
      description: "You're building momentum. Practice again tomorrow to start a streak!",
      action: "motivate",
    });
  }

  if (stats && stats.recentScore > 85) {
    recommendations.push({
      type: "achievement",
      title: "🎉 Excellent Score!",
      description: `Your last session scored ${stats.recentScore}%! Challenge yourself with harder questions.`,
      action: "challenge",
    });
  }

  if (recommendations.length === 0 && stats && stats.totalSessions === 0) {
    recommendations.push({
      type: "welcome",
      title: "👋 Welcome!",
      description: "Start your first session to get personalized insights and track your progress.",
      action: "start",
    });
  }

  return recommendations.slice(0, 3);
}