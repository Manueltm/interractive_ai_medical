// app/api/chat/token/optimized/route.ts (Proxy version)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { voiceId, systemPrompt } = await req.json();
    
    console.log('Proxy optimized token request to main endpoint');
    
    // Just call your existing working endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/chat/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voiceId, systemPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Token endpoint failed: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Optimized token generation error:', error);
    
    // Fallback to original endpoint as last resort
    try {
      console.log('Trying fallback to original endpoint logic...');
      // Add your original token generation logic here
      // Copy the working code from your existing /api/chat/token/route.ts
      
    } catch (fallbackError) {
      return NextResponse.json({ 
        error: 'Failed to generate token in both optimized and fallback modes',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
}