//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\applications\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { application } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Get all applications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await db
      .select()
      .from(application)
      .where(eq(application.isActive, true))
      .orderBy(application.name);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create new application (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, icon, color, requiresApproval } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const [newApplication] = await db.insert(application).values({
      name,
      slug,
      description,
      icon,
      color,
      requiresApproval: requiresApproval ?? true,
    }).returning();

    return NextResponse.json({ application: newApplication });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}