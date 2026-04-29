// app/api/save-cbt-selection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { cbtSelection } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// In app/api/save-cbt-selection/route.ts - Update POST handler
// In app/api/save-cbt-selection/route.ts - make sure sessionId is being saved
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId, selectedOption, sessionId, firstAttempt = true } = await req.json();

  if (!questionId || typeof selectedOption !== 'number') {
    return NextResponse.json({ 
      error: 'Missing questionId or selectedOption' 
    }, { status: 400 });
  }

  try {
    // Check if selection already exists for this user and question in this session
    const existing = await db
      .select()
      .from(cbtSelection)
      .where(
        and(
          eq(cbtSelection.userId, session.user.id),
          eq(cbtSelection.questionId, questionId),
          eq(cbtSelection.sessionId, sessionId) // Important: check within the same session
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing selection within the same session
      await db
        .update(cbtSelection)
        .set({
          selectedOption,
          firstAttempt: firstAttempt,
        })
        .where(
          and(
            eq(cbtSelection.userId, session.user.id),
            eq(cbtSelection.questionId, questionId),
            eq(cbtSelection.sessionId, sessionId)
          )
        );
    } else {
      // Insert new selection with sessionId
      await db.insert(cbtSelection).values({
        userId: session.user.id,
        questionId,
        selectedOption,
        sessionId: sessionId, // Make sure this is always provided
        firstAttempt,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving CBT selection:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}