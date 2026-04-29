// app/api/cbt-option-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { and, sql, eq, count, isNull } from 'drizzle-orm';
import { cbtSelection } from '@/lib/db/schema';


// app/api/cbt-option-stats/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('questionId');
  if (!questionId)
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });

  /* ---- first-attempt selections only ---- */
  const raw = await db
    .select({
      selectedIndex: cbtSelection.selectedOption,
      cnt: count(),
    })
    .from(cbtSelection)
    .where(
      and(
        eq(cbtSelection.questionId, questionId),
        eq(cbtSelection.firstAttempt, true)
      )
    )
    .groupBy(cbtSelection.selectedOption);

  const totalFirstAnswers = raw.reduce((acc, r) => acc + r.cnt, 0);
  const firstCounts = Array(5).fill(0);
  
  // FIX: Handle null selectedIndex
  raw.forEach((r) => {
    if (r.selectedIndex !== null) {
      firstCounts[r.selectedIndex] = r.cnt;
    }
  });

  /* ---- correct option index ---- */
  const [q] = await db
    .select({ options: sql`options` as any })
    .from(sql`cbt_question`)
    .where(sql`id = ${questionId}`)
    .limit(1);
  if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const optionsArray = (q.options as any[]) ?? [];
  const correctIdx = optionsArray.findIndex((o) => o.correct);
  if (correctIdx === -1) {
    return NextResponse.json({ error: 'No correct option found' }, { status: 500 });
  }

  /* ---- stats: full-green for correct, full-red for others ---- */
  const stats = firstCounts.map((picked, idx) => ({
    pct:
      totalFirstAnswers === 0
        ? 0
        : Math.round((picked / totalFirstAnswers) * 100),
    totalPicked: picked,
    isCorrect: idx === correctIdx,
  }));

  return NextResponse.json({ stats, correctIdx });
}