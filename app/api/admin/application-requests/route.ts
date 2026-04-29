import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { userApplicationAccess, application, user } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get application requests (pending or approved)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") || "pending";
    const isApproved = status === "approved";

    const requests = await db
      .select({
        id: userApplicationAccess.id,
        userId: userApplicationAccess.userId,
        applicationId: userApplicationAccess.applicationId,
        isApproved: userApplicationAccess.isApproved,
        notes: userApplicationAccess.notes,
        createdAt: userApplicationAccess.createdAt,
        approvedAt: userApplicationAccess.approvedAt,
        user: {
          email: user.email,
          role: user.role,
        },
        application: {
          name: application.name,
          slug: application.slug,
          icon: application.icon,
          color: application.color,
        }
      })
      .from(userApplicationAccess)
      .innerJoin(user, eq(user.id, userApplicationAccess.userId))
      .innerJoin(application, eq(application.id, userApplicationAccess.applicationId))
      .where(eq(userApplicationAccess.isApproved, isApproved))
      .orderBy(desc(userApplicationAccess.createdAt));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching application requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Approve or reject request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action, approvedBy, notes } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    if (action === 'approve') {
      await db
        .update(userApplicationAccess)
        .set({ 
          isApproved: true, 
          approvedBy: approvedBy || session.user.id,
          approvedAt: new Date(),
          notes: notes || null
        })
        .where(eq(userApplicationAccess.id, requestId));
      
      return NextResponse.json({ message: "Request approved successfully" });
    } 
    else if (action === 'reject') {
      await db
        .delete(userApplicationAccess)
        .where(eq(userApplicationAccess.id, requestId));
      
      return NextResponse.json({ message: "Request rejected successfully" });
    }
    else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error updating application request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Revoke access (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    await db
      .delete(userApplicationAccess)
      .where(eq(userApplicationAccess.id, requestId));

    return NextResponse.json({ message: "Access revoked successfully" });

  } catch (error) {
    console.error("Error revoking access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}