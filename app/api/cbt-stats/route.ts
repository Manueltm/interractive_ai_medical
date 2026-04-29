// app/api/cbt-stats/route.ts - UPDATED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth';
import { getCbtStats } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get('type') || 'all';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Convert type to the expected format
  const type = (typeParam === 'mdcn' || typeParam === 'mbbs') ? typeParam : 'all';

  try {
    const stats = await getCbtStats(
      session.user.id,
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Ensure we return the complete structure
    return NextResponse.json({
      totalAttempts: stats.totalAttempts || 0,
      totalQuestions: stats.totalQuestions || 0,
      correct: stats.correct || 0,
      wrong: stats.wrong || 0,
      unanswered: stats.unanswered || 0,
      avgScore: stats.avgScore || 0,
      completedSessions: stats.completedSessions || 0,
      scoresData: stats.scoresData || [],
      modeBreakdown: stats.modeBreakdown || { practice: 0, timed: 0, exam: 0 },
      accuracy: stats.accuracy || 0,
      completionRate: stats.completionRate || 0
    });
  } catch (error) {
    console.error('Error fetching CBT stats:', error);
    return NextResponse.json({ 
      totalAttempts: 0,
      totalQuestions: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
      avgScore: 0,
      completedSessions: 0,
      scoresData: [],
      modeBreakdown: { practice: 0, timed: 0, exam: 0 },
      accuracy: 0,
      completionRate: 0
    });
  }
}