// Alternative fix for app/api/cbt-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import { getCbtHistory } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  
  // Extract and validate parameters
  const typeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');
  const search = searchParams.get('search') ?? undefined;

  // Convert to correct types, filtering out invalid values
  const type = (typeParam === 'mdcn' || typeParam === 'mbbs') ? typeParam : undefined;
  const status = (statusParam === 'correct' || statusParam === 'incorrect' || statusParam === 'unanswered') 
    ? statusParam 
    : undefined;

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (searchParams.get('startDate')) startDate = new Date(searchParams.get('startDate')!);
  if (searchParams.get('endDate')) endDate = new Date(searchParams.get('endDate')!);

  try {
    const history = await getCbtHistory(session.user.id, {
      type,
      status,
      search,
      startDate,
      endDate,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching CBT history:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}