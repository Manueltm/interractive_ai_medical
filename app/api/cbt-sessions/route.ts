// app/api/cbt-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import { createCbtSession, getCbtSessions } from '@/lib/db/queries';

// In app/api/cbt-sessions/route.ts - Update POST handler
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('📥 Creating CBT session with data:', body);
    
    // Remove any Date objects that might cause issues
    const sessionData = {
      ...body,
      userId: session.user.id,
      // Let the database handle timestamps automatically
    };
    
    // Remove any potential problematic fields
    delete sessionData.completedAt;
    delete sessionData.createdAt;
    delete sessionData.updatedAt;

    const newSession = await createCbtSession(sessionData);
    console.log('✅ CBT session created:', newSession.id);
    
    return NextResponse.json(newSession);
  } catch (error) {
    console.error('❌ Error creating CBT session:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'mdcn' | 'mbbs' | undefined;
  const mode = searchParams.get('mode') as 'practice' | 'timed' | 'exam' | undefined;
  
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (searchParams.get('startDate')) startDate = new Date(searchParams.get('startDate')!);
  if (searchParams.get('endDate')) endDate = new Date(searchParams.get('endDate')!);

  try {
    const sessions = await getCbtSessions(session.user.id, {
      type,
      mode,
      startDate,
      endDate,
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching CBT sessions:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}