import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { db } from '@/lib/db';
import { adImage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, newOrder } = await req.json();

    await db.update(adImage)
      .set({ order: newOrder, updatedAt: new Date() })
      .where(eq(adImage.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}