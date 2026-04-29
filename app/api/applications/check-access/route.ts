import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { application, userApplicationAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ hasAccess: false, error: "Unauthorized" }, { status: 401 });
    }

    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Application slug is required" }, { status: 400 });
    }

    // Admin always has access
    if (session.user.role === "admin") {
      const apps = await db
        .select()
        .from(application)
        .where(and(eq(application.slug, slug), eq(application.isActive, true)));

      return NextResponse.json({ 
        hasAccess: true, 
        isAdmin: true,
        application: apps[0] || null,
        pendingRequest: false
      });
    }

    // Find the application
    const apps = await db
      .select()
      .from(application)
      .where(and(eq(application.slug, slug), eq(application.isActive, true)));

    if (apps.length === 0) {
      return NextResponse.json({ 
        hasAccess: false, 
        error: "Application not found",
        application: null,
        pendingRequest: false
      }, { status: 404 });
    }

    const app = apps[0];

    // Check if user has any access request (pending or approved)
    const accessRecords = await db
      .select()
      .from(userApplicationAccess)
      .where(
        and(
          eq(userApplicationAccess.userId, session.user.id),
          eq(userApplicationAccess.applicationId, app.id)
        )
      );

    const hasApprovedAccess = accessRecords.some(record => record.isApproved);
    const hasPendingRequest = accessRecords.some(record => !record.isApproved);

    // If application doesn't require approval, grant access
    if (!app.requiresApproval) {
      return NextResponse.json({ 
        hasAccess: true, 
        requiresApproval: false,
        application: app,
        pendingRequest: false
      });
    }

    return NextResponse.json({ 
      hasAccess: hasApprovedAccess,
      requiresApproval: true,
      application: app,
      pendingRequest: hasPendingRequest
    });

  } catch (error) {
    console.error("Error checking application access:", error);
    return NextResponse.json({ 
      hasAccess: false, 
      error: "Internal Server Error",
      application: null,
      pendingRequest: false
    }, { status: 500 });
  }
}