//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\sessions\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config"; // Add this import
import { getSessionsByUser } from "@/lib/db/queries";
import { createSession } from "@/lib/db/queries";
import type { NewSession } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession(authConfig); // Fix: Pass authConfig
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessions = await getSessionsByUser(session.user.id);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig); // Fix: Pass authConfig
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: Omit<NewSession, "createdAt" | "updatedAt" | "completedAt"> = await request.json();
    const newSession = { ...body, userId: session.user.id };
    const created = await createSession(newSession);
    return NextResponse.json(created[0]);
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}