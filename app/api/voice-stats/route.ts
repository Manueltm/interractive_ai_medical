// app/api/voice-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { db } from '@/lib/db';
import { chat, sessionTable } from '@/lib/db/schema'; // Added sessionTable
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let query = db.select({
      status: chat.status,
      latestScore: chat.latestScore,
      createdAt: chat.createdAt,
    }).from(chat)
      .leftJoin(sessionTable, eq(chat.sessionId, sessionTable.id))
      .where(and(
        eq(chat.userId, session.user.id),
        filter !== 'all' ? eq(sessionTable.type, filter as 'clerking' | 'counselling' | 'physical_exam') : undefined,
        startDate ? gte(chat.createdAt, new Date(startDate)) : undefined,
        endDate ? lte(chat.createdAt, new Date(endDate)) : undefined
      ));

    const chats = await query;

    const total = chats.length;
    const completed = chats.filter(c => c.status === 'completed').length;
    const incomplete = total - completed;

    const scoresData = chats.map(c => c.latestScore ?? 0);
    const validScores = chats.filter(c => c.latestScore !== null).map(c => c.latestScore!);
    const validScoresCount = validScores.length;
    const avgScore = validScoresCount > 0 ? validScores.reduce((a, b) => a + b, 0) / validScoresCount : 0;
    const absoluteAvgScore = total > 0 ? scoresData.reduce((a, b) => a + b, 0) / total : 0;

    return NextResponse.json({
      total,
      avgScore,
      absoluteAvgScore,
      completed,
      incomplete,
      scoresData,
      validScoresCount,
    });
  } catch (error) {
    console.error('Error fetching voice stats:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}