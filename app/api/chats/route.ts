// app/api/chats/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { saveChat, getChatsBySessionAndStation } from "@/lib/db/queries";
import type { NewChat } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Explicitly construct the chat object with all fields including departmentId
    const newChat = {
      id: body.id,
      sessionId: body.sessionId,
      userId: session.user.id,
      patientId: body.patientId,
      title: body.title,
      visibility: body.visibility || 'private',
      status: body.status || 'incomplete',
      stationIndex: body.stationIndex || 0,
      departmentId: body.departmentId || null, // ← Explicitly include
      lastContext: body.lastContext,
      latestScore: body.latestScore,
      latestGrade: body.latestGrade,
      latestFeedback: body.latestFeedback,
      examSteps: body.examSteps,
    };
    
    console.log('Creating chat with departmentId:', newChat.departmentId);
    
    const created = await saveChat(newChat);
    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const stationIndex = searchParams.get('stationIndex');
    
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    
    const chats = await getChatsBySessionAndStation(
      sessionId, 
      stationIndex ? parseInt(stationIndex) : undefined, 
      session.user.id
    );
    
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}