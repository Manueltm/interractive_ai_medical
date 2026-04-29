// app/api/sessions/[id]/status/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config"; // Add this import
import { updateSessionStatus } from "@/lib/db/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
  }
  try {
    const session = await getServerSession(authConfig); // Fix: Pass authConfig
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { status } = body;
    if (!["active", "completed", "saved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await updateSessionStatus(id, status as any);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}