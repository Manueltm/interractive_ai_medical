// app/api/chats/quick-start/route.ts (Simplified version)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId, duration, type } = await req.json();
    
    // Use your existing session creation endpoint
    const sessionRes = await fetch(`${process.env.NEXTAUTH_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.user.id,
        type: type,
        numStations: 1,
        duration: duration,
        status: 'active',
      }),
    });

    if (!sessionRes.ok) throw new Error('Failed to create session');
    const newSession = await sessionRes.json();

    // Use your existing chat creation endpoint
    const chatRes = await fetch(`${process.env.NEXTAUTH_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: newSession.id,
        userId: session.user.id,
        patientId: patientId,
        title: `Quick ${type}`,
        type: type,
        status: 'incomplete',
        stationIndex: 0,
        totalStations: 1,
        visibility: 'private',
      }),
    });

    if (!chatRes.ok) throw new Error('Failed to create chat');
    const chat = await chatRes.json();

    return NextResponse.json({ 
      chatId: chat.id,
      success: true 
    });
    
  } catch (error) {
    console.error('Quick start error:', error);
    return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 });
  }
}