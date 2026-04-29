// C:\Users\User\hume-voice-simulator\app\api\leaderboard\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'scenarios' | 'flashcards' || 'scenarios';
    const scoreType = searchParams.get('scoreType') as 'valid' | 'absolute' || 'valid';
    
    const data = await getLeaderboard(filter, scoreType);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}