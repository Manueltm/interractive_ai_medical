import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { application, userApplicationAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { applicationId, slug } = body;

    // If slug is provided but no applicationId, fetch the application
    if (!applicationId && slug) {
      const apps = await db
        .select()
        .from(application)
        .where(eq(application.slug, slug));
      
      if (apps.length === 0) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      
      applicationId = apps[0].id;
    }

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID or slug is required" }, { status: 400 });
    }

    // Check if request already exists
    const existing = await db
      .select()
      .from(userApplicationAccess)
      .where(
        and(
          eq(userApplicationAccess.userId, session.user.id),
          eq(userApplicationAccess.applicationId, applicationId)
        )
      );

    if (existing.length > 0) {
      if (existing[0].isApproved) {
        return NextResponse.json({ 
          message: "You already have access to this application",
          status: "approved" 
        });
      } else {
        return NextResponse.json({ 
          message: "Access request already pending",
          status: "pending" 
        });
      }
    }

    // Create access request
    await db.insert(userApplicationAccess).values({
      userId: session.user.id,
      applicationId,
      isApproved: false,
    });

    return NextResponse.json({ 
      message: "Access request submitted successfully. An admin will review your request.",
      status: "pending" 
    });

  } catch (error) {
    console.error("Error requesting application access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}