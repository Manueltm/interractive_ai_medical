//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\cbt-questions\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/(auth)/auth';
import { getCbtQuestions, getCbtQuestionsByType } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cbtType = searchParams.get('cbtType') as 'mdcn' | 'mbbs' | null;
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const limit = Number(searchParams.get('limit')) || undefined;

  if (!cbtType) {
    return NextResponse.json({ error: 'Missing cbtType' }, { status: 400 });
  }

  try {
    const rows =
      categoryId && categoryId !== 'all'
        ? await getCbtQuestions(categoryId, limit)
        : await getCbtQuestionsByType(cbtType, limit);

    if (!rows.length) {
      return NextResponse.json(
        { message: 'No questions available for this selection.', cbtType, categoryId: categoryId || 'all' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/cbt-questions', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}