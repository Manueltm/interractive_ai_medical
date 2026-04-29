import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { db } from '@/lib/db';
import { adImage } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET ads
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const now = new Date();

    if (activeOnly) {
      // Get active ads for display - simpler version without date filtering
      const ads = await db.select()
        .from(adImage)
        .where(eq(adImage.isActive, true))
        .orderBy(adImage.order);
      
      console.log('Active ads found:', ads.length);
      return NextResponse.json(ads);
    }

    // Admin view - get all ads
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ads = await db.select().from(adImage).orderBy(adImage.order);
    return NextResponse.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}