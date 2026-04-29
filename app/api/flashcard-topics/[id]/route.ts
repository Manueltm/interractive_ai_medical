// app/api/flashcard-topics/[id]/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { updateFlashcardTopic, deleteFlashcardTopic, getUser } from "@/lib/db/queries";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await getUser(session.user.email || '');
    const userRole = users[0]?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }
    const body = await request.json();
    const updated = await updateFlashcardTopic(params.id, body);
    return NextResponse.json(
      { data: updated, message: "Topic updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating topic:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await getUser(session.user.email || '');
    if (users[0]?.role !== 'admin') return NextResponse.json({ error: "Admin required" }, { status: 403 });

    await deleteFlashcardTopic(params.id);
    return NextResponse.json({ message: "Topic deleted" }, { status: 200 });
  } catch (e) {
    console.error("Error deleting topic:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}