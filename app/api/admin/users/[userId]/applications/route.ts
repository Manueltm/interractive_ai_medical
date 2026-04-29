import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { application, userApplicationAccess } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/admin/users/[userId]/applications - Get all applications with user's access status
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    // Get all active applications
    const allApps = await db
      .select()
      .from(application)
      .where(eq(application.isActive, true))
      .orderBy(application.name);

    // Get user's approved applications
    const userAccess = await db
      .select({
        applicationId: userApplicationAccess.applicationId,
        isApproved: userApplicationAccess.isApproved,
        approvedAt: userApplicationAccess.approvedAt,
      })
      .from(userApplicationAccess)
      .where(
        and(
          eq(userApplicationAccess.userId, userId),
          eq(userApplicationAccess.isApproved, true)
        )
      );

    // Create a set of approved application IDs for quick lookup
    const approvedAppIds = new Set(userAccess.map(a => a.applicationId));

    // Combine the data
    const applicationsWithAccess = allApps.map(app => ({
      ...app,
      hasAccess: approvedAppIds.has(app.id),
    }));

    return NextResponse.json({ 
      applications: applicationsWithAccess,
      userId 
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/admin/users/[userId]/applications - Update user's application access
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const body = await request.json();
    const { applicationId, grant } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    if (grant) {
      // Grant access - check if exists first
      const existing = await db
        .select()
        .from(userApplicationAccess)
        .where(
          and(
            eq(userApplicationAccess.userId, userId),
            eq(userApplicationAccess.applicationId, applicationId)
          )
        );

      if (existing.length > 0) {
        // Update existing record to approved
        await db
          .update(userApplicationAccess)
          .set({ 
            isApproved: true, 
            approvedBy: session.user.id,
            approvedAt: new Date(),
          })
          .where(
            and(
              eq(userApplicationAccess.userId, userId),
              eq(userApplicationAccess.applicationId, applicationId)
            )
          );
      } else {
        // Create new approved record
        await db.insert(userApplicationAccess).values({
          userId,
          applicationId,
          isApproved: true,
          approvedBy: session.user.id,
          approvedAt: new Date(),
        });
      }
    } else {
      // Revoke access - either delete or set to false
      await db
        .delete(userApplicationAccess)
        .where(
          and(
            eq(userApplicationAccess.userId, userId),
            eq(userApplicationAccess.applicationId, applicationId)
          )
        );
    }

    return NextResponse.json({ 
      message: grant ? "Access granted" : "Access revoked",
      success: true 
    });
  } catch (error) {
    console.error("Error updating user application access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}