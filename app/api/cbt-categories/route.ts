import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import {
  getCbtCategories,
  createCbtCategory,
} from '@/lib/db/queries';

/* GET – list categories --------------------------------------------------*/
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cbtType = searchParams.get('cbtType') as 'mdcn' | 'mbbs' | 'smart'; // Add 'smart'

  if (!cbtType)
    return NextResponse.json({ error: 'Missing cbtType' }, { status: 400 });

  // Handle 'smart' type - return empty array
  if (cbtType === 'smart') {
    console.log('🤖 Smart CBT type requested - returning empty categories');
    return NextResponse.json([]); // Return empty array for smart type
  }

  try {
    const rows = await getCbtCategories(cbtType);
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/cbt-categories', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* POST – create category --------------------------------------------------*/
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, slug, cbtType } = body;

  if (!name || !slug || !cbtType)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Prevent creating categories for 'smart' type
  if (cbtType === 'smart') {
    return NextResponse.json(
      { error: 'Cannot create categories for smart type' }, 
      { status: 400 }
    );
  }

  try {
    const created = await createCbtCategory(name, slug, cbtType);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST /api/cbt-categories', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}