// app/api/cbt-leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cbtSelection, user, cbtQuestion, cbtCategory } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scoreType = searchParams.get('scoreType') || 'valid';

  try {
    // Get all selections with user info
    const selections = await db
      .select({
        userId: user.id,
        username: user.email,
        selectedOption: cbtSelection.selectedOption,
        options: cbtQuestion.options,
      })
      .from(cbtSelection)
      .innerJoin(user, eq(cbtSelection.userId, user.id))
      .innerJoin(cbtQuestion, eq(cbtSelection.questionId, cbtQuestion.id))
      .where(
        and(
          eq(cbtSelection.firstAttempt, true),
          scoreType === 'valid' 
            ? sql`${cbtSelection.selectedOption} IS NOT NULL`
            : undefined
        )
      );

    // Calculate scores per user
    const userStats = new Map();
    
    selections.forEach(selection => {
      const { userId, username, selectedOption, options } = selection;
      
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          username: username?.split('@')[0] || 'Anonymous',
          totalAttempts: 0,
          totalScore: 0,
          validAttempts: 0,
        });
      }
      
      const userStat = userStats.get(userId);
      userStat.totalAttempts++;
      
      if (selectedOption !== null) {
        userStat.validAttempts++;
        const optionArray = options as { text: string; correct: boolean }[];
        const correctIndex = optionArray.findIndex(opt => opt.correct);
        const score = selectedOption === correctIndex ? 100 : 0;
        userStat.totalScore += score;
      }
    });

    // Convert to array and calculate averages
    const leaderboardData = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        username: stats.username,
        avgScore: stats.validAttempts > 0 ? Math.round((stats.totalScore / stats.validAttempts) * 10) / 10 : 0,
        totalAttempts: stats.totalAttempts,
        validScores: stats.validAttempts,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 20);

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching CBT leaderboard:', error);
    return NextResponse.json([], { status: 500 });
  }
}