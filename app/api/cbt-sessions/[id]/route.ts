// app/api/cbt-sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import { updateCbtSession, getCbtSessionWithDetails } from '@/lib/db/queries';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Convert completedAt string to Date object if it exists
    const updateData = { ...body };
    if (updateData.completedAt) {
      updateData.completedAt = new Date(updateData.completedAt);
    }
    
    const updatedSession = await updateCbtSession(params.id, updateData);
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating CBT session:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}


export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 API: Fetching CBT session details for ID:', params.id);
    
    const sessionDetails = await getCbtSessionWithDetails(params.id, session.user.id);
    
    if (!sessionDetails) {
      console.log('❌ API: Session not found');
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('✅ API: Session details found:', {
      sessionId: sessionDetails.session.id,
      questionsCount: sessionDetails.questions.length,
      hasQuestions: sessionDetails.questions.length > 0,
      firstQuestion: sessionDetails.questions[0] ? 'exists' : 'none'
    });

    return NextResponse.json(sessionDetails);
  } catch (error) {
    console.error('❌ API Error fetching CBT session details:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}