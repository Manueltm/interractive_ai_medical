// app/api/flash-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { db } from '@/lib/db';
import { flashcardHistory, sessionTable } from '@/lib/db/schema'; // Added sessionTable import
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const query = db.select({
      sessionId: flashcardHistory.sessionId,
      count: sql`count(*)`.as('count'),
    }).from(flashcardHistory)
      .innerJoin(sessionTable, eq(flashcardHistory.sessionId, sessionTable.id))
      .where(and(
        eq(sessionTable.userId, session.user.id),
        startDate ? gte(flashcardHistory.createdAt, new Date(startDate)) : undefined,
        endDate ? lte(flashcardHistory.createdAt, new Date(endDate)) : undefined
      ))
      .groupBy(flashcardHistory.sessionId);

    const groups = await query;

    const total = groups.length;
    const sessionsData = groups.map(g => g.count as number);
    const avgQuestions = total > 0 ? sessionsData.reduce((a, b) => a + b, 0) / total : 0;

    return NextResponse.json({
      total,
      avgQuestions,
      sessionsData,
    });
  } catch (error) {
    console.error('Error fetching flash stats:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}