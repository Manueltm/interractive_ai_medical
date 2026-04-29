// app/api/chat/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHumeAccessToken } from '@/utils/getHumeAccessToken';

export async function POST(req: NextRequest) {
  try {
    const { configId } = await req.json();
    // If getHumeAccessToken doesn't need configId, just call it without arguments
    const token = await getHumeAccessToken();
    return NextResponse.json({ accessToken: token });
  } catch (e: any) {
    console.error('[/api/chat/token]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}