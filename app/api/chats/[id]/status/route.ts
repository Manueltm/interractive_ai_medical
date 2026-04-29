// app/api/chats/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { updateChatStatus } from '@/lib/db/queries';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json(); // "incomplete" | "completed"
    if (status !== 'incomplete' && status !== 'completed') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await updateChatStatus(params.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update chat status error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}