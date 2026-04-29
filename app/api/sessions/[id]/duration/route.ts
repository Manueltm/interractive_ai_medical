//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\sessions\[id]\duration\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { db } from '@/lib/db';
import { sessionTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { duration } = await req.json();
    if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const [updated] = await db
      .update(sessionTable)
      .set({ duration })
      .where(eq(sessionTable.id, params.id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update duration error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}