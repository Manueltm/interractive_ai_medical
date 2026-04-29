import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user, userApplicationAccess } from "@/lib/db/schema";
import { desc, eq, sql, and, like, or } from "drizzle-orm";

// Get all users with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where clause
    let whereClause = sql`1=1`;
    
    if (search) {
      whereClause = sql`${whereClause} AND (${user.email} ILIKE ${`%${search}%`} OR ${user.id}::text ILIKE ${`%${search}%`})`;
    }
    
    if (role) {
      whereClause = sql`${whereClause} AND ${user.role} = ${role}`;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);
    
    const totalCount = Number(countResult[0]?.count || 0);

    // Get users
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        tokenBalance: user.tokenBalance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Add a synthetic status field (you can expand this based on your needs)
        status: sql<string>`CASE 
          WHEN ${user.role} = 'admin' THEN 'admin'
          ELSE 'active'
        END`,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset);

    // Get application access counts for each user
    const usersWithAccess = await Promise.all(
      users.map(async (u) => {
        const accessCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userApplicationAccess)
          .where(
            and(
              eq(userApplicationAccess.userId, u.id),
              eq(userApplicationAccess.isApproved, true)
            )
          );
        
        return {
          ...u,
          approvedAppsCount: Number(accessCount[0]?.count || 0),
        };
      })
    );

    return NextResponse.json({
      users: usersWithAccess,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update user role or tokens
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, value } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action are required" }, { status: 400 });
    }

    switch (action) {
      case 'update-role':
        if (!value || !['user', 'admin'].includes(value)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        await db.update(user).set({ role: value }).where(eq(user.id, userId));
        return NextResponse.json({ message: "User role updated successfully" });

      case 'update-tokens':
        // Allow decimal numbers with up to 4 decimal places
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json({ error: "Invalid token amount" }, { status: 400 });
        }
        // Round to 4 decimal places to prevent floating point issues
        const roundedValue = Math.round(value * 10000) / 10000;
        await db.update(user).set({ tokenBalance: roundedValue }).where(eq(user.id, userId));
        return NextResponse.json({ message: "Token balance updated successfully" });

      case 'delete':
        // Optional: Implement soft delete or actual delete
        await db.delete(user).where(eq(user.id, userId));
        return NextResponse.json({ message: "User deleted successfully" });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}