// app/api/elevenlabs/token/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID;

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { 
          "xi-api-key": process.env.ELEVENLABS_API_KEY! 
        },
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error('ElevenLabs signed URL error:', text);
      return NextResponse.json(
        { error: "Failed to get signed URL", details: text }, 
        { status: 500 }
      );
    }

    const data = await resp.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return NextResponse.json(
      { error: "Failed to get signed URL" }, 
      { status: 500 }
    );
  }
}