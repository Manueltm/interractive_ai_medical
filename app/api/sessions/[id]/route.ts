// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth'; // Import full options
import { db } from '@/lib/db';
import { sessionTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const session = await getServerSession(authOptions); // Use full authOptions

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 401 });
  }

  try {
    const sessionData = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId)).limit(1);
    if (!sessionData.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Ownership check (assuming sessionTable has userId field)
    if (sessionData[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 401 });
    }

    return NextResponse.json(sessionData[0]);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 401 });

  try {
    // Optional: Re-fetch to check ownership before update
    const existing = await db.select({ userId: sessionTable.userId }).from(sessionTable).where(eq(sessionTable.id, params.id)).limit(1);
    if (!existing.length || existing[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 401 });
    }

    const body = await req.json();
    const [updated] = await db
      .update(sessionTable)
      .set(body)
      .where(eq(sessionTable.id, params.id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update session error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}