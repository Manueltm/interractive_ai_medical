// C:\Users\User\hume-voice-simulator\app\api\topics\[departmentId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { createFlashcardTopic, getTopicsByDepartment, getUser } from "@/lib/db/queries";

export async function GET(request: NextRequest, { params }: { params: { departmentId: string } }) {
  try {
    const topics = await getTopicsByDepartment(params.departmentId);
    return NextResponse.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { departmentId: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Fetch user role from DB to ensure it's up-to-date
    const users = await getUser(session.user.email || '');
    const userRole = users[0]?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }
    const { topic } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }
    const newTopic = await createFlashcardTopic(params.departmentId, topic);
    return NextResponse.json(
      { data: newTopic, message: "Topic created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating topic:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}