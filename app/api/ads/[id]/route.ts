import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { db } from '@/lib/db';
import { adImage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET single ad
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ad = await db.select().from(adImage).where(eq(adImage.id, params.id));
    if (!ad.length) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(ad[0]);
  } catch (error) {
    console.error('Error fetching ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update ad
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, imageUrl, linkUrl, order, isActive, startDate, endDate } = body;

    const updated = await db.update(adImage)
      .set({
        title: title || undefined,
        description: description || null,
        imageUrl: imageUrl || undefined,
        linkUrl: linkUrl || null,
        order: order !== undefined ? order : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(adImage.id, params.id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE ad
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await db.delete(adImage).where(eq(adImage.id, params.id)).returning();
    if (!deleted.length) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}