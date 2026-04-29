// app/api/chats/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getChatsByUser, getPatientById, getSessionById, getDepartmentById } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { chat, department } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch chats with department relation using Drizzle
    const chats = await db
      .select({
        id: chat.id,
        title: chat.title,
        patientId: chat.patientId,
        createdAt: chat.createdAt,
        status: chat.status,
        sessionId: chat.sessionId,
        stationIndex: chat.stationIndex,
        examSteps: chat.examSteps,
        latestScore: chat.latestScore,
        latestGrade: chat.latestGrade,
        latestFeedback: chat.latestFeedback,
        departmentId: chat.departmentId,
        departmentName: department.name,
        departmentSlug: department.slug,
      })
      .from(chat)
      .leftJoin(department, eq(chat.departmentId, department.id))
      .where(eq(chat.userId, session.user.id))
      .orderBy(desc(chat.createdAt));
    
    console.log('Raw chats from DB with department:', chats.length);
    
    // Fetch patient names and session types
    const chatHistory = await Promise.all(chats.map(async (chatRecord) => {
      let type = null;
      if (chatRecord.sessionId) {
        const sessionData = await getSessionById(chatRecord.sessionId);
        type = sessionData?.type || null;
      }
      
      const patient = chatRecord.patientId ? await getPatientById(chatRecord.patientId) : null;
      
      return {
        id: chatRecord.id,
        title: chatRecord.title,
        patientId: chatRecord.patientId,
        patientName: patient?.name || 'Unknown Patient',
        createdAt: chatRecord.createdAt,
        status: chatRecord.status,
        type,
        latestScore: chatRecord.latestScore,
        latestGrade: chatRecord.latestGrade,
        latestFeedback: chatRecord.latestFeedback,
        sessionId: chatRecord.sessionId,
        stationIndex: chatRecord.stationIndex,
        examSteps: chatRecord.examSteps,
        department: chatRecord.departmentId ? {
          id: chatRecord.departmentId,
          name: chatRecord.departmentName || 'General Medicine',
          slug: chatRecord.departmentSlug
        } : null,
      };
    }));
    
    console.log('Final chat history count with departments:', chatHistory.length);
    
    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}