import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db
      .select({
        profileImage: user.profileImage,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      profileImage: users[0].profileImage,
      name: users[0].name,
      email: users[0].email 
    });
  } catch (error) {
    console.error("Error fetching profile image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}