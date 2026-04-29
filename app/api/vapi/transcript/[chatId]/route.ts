// app/api/vapi/transcript/[chatId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getChatById } from "@/lib/db/queries";

const VAPI_API_KEY = process.env.VAPI_API_KEY!;
const VAPI_BASE_URL = "https://api.vapi.ai";

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get chat to verify ownership and get vapiCallId
    const chat = await getChatById(params.chatId);
    
    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized or chat not found" }, { status: 401 });
    }

    const vapiCallId = chat.vapiCallId;
    
    if (!vapiCallId) {
      return NextResponse.json({ error: "No Vapi call ID found for this chat" }, { status: 404 });
    }

    // Fetch call details from Vapi
    const response = await fetch(`${VAPI_BASE_URL}/call/${vapiCallId}`, {
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error("Vapi API error:", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch call from Vapi" },
        { status: response.status }
      );
    }

    const callData = await response.json();
    
    // Extract messages from artifact (most accurate)
    const messages: Array<{ role: 'student' | 'patient'; content: string; timestamp: string }> = [];
    
    if (callData.artifact?.messages && Array.isArray(callData.artifact.messages)) {
      // Filter for transcript messages and map to our format
      const artifactMessages = callData.artifact.messages
        .filter((msg: any) => 
          msg.type === 'transcript' && 
          msg.transcript && 
          typeof msg.transcript === 'string' &&
          msg.transcript.trim().length > 0
        )
        .map((msg: any) => ({
          role: msg.role === 'user' ? 'student' : 'patient',
          content: msg.transcript.trim(),
          timestamp: msg.timestamp || callData.startedAt || new Date().toISOString(),
        }));
      
      messages.push(...artifactMessages);
    }
    
    // Fallback to transcript string if no artifact messages
    if (messages.length === 0 && callData.transcript) {
      const transcriptLines = callData.transcript.split('\n');
      
      for (const line of transcriptLines) {
        // Try to match "Speaker: message" format
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const speaker = match[1].toLowerCase();
          const content = match[2].trim();
          
          let role: 'student' | 'patient';
          if (speaker.includes('user') || speaker.includes('student') || speaker.includes('doctor')) {
            role = 'student';
          } else if (speaker.includes('assistant') || speaker.includes('patient')) {
            role = 'patient';
          } else {
            continue;
          }
          
          messages.push({
            role,
            content,
            timestamp: callData.startedAt || new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      messages,
      callData: {
        startedAt: callData.startedAt,
        endedAt: callData.endedAt,
        duration: callData.duration,
        status: callData.status,
        stereoRecordingUrl: callData.stereoRecordingUrl,
        monoRecordingUrl: callData.monoRecordingUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching Vapi transcript:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}