// app/api/sessions/saved/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";   // ✅ import auth config
import { getSavedSessionsByUser } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig); // ✅ pass config

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedSessions = await getSavedSessionsByUser(session.user.id);
    return NextResponse.json(savedSessions, { status: 200 });
  } catch (error) {
    console.error("Error fetching saved sessions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
