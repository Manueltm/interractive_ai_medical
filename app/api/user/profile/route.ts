import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt-ts";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        profileImage: user.profileImage,
        role: user.role,
        tokenBalance: user.tokenBalance,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, bio, profileImage, currentPassword, newPassword } = body;

    const updates: any = {};
    const errors: string[] = [];

    // Update name if provided
    if (name !== undefined) {
      updates.name = name;
    }

    // Update bio if provided
    if (bio !== undefined) {
      updates.bio = bio;
    }

    // Update profile image if provided
    if (profileImage !== undefined) {
      updates.profileImage = profileImage;
    }

    // Update email if provided and different from current
    if (email !== undefined && email !== session.user.email) {
      // Check if email is already taken
      const existingUsers = await db
        .select()
        .from(user)
        .where(eq(user.email, email));
      
      if (existingUsers.length > 0 && existingUsers[0].id !== session.user.id) {
        errors.push("Email already in use");
      } else {
        updates.email = email;
      }
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.id, session.user.id));
      
      if (users.length === 0) {
        errors.push("User not found");
      } else {
        const userRecord = users[0];
        
        // If user has a password (not Google auth), verify current password
        if (userRecord.password) {
          const bcrypt = await import("bcrypt-ts");
          const isValid = await bcrypt.compare(currentPassword, userRecord.password);
          if (!isValid) {
            errors.push("Current password is incorrect");
          } else {
            const hashedPassword = await hash(newPassword, 10);
            updates.password = hashedPassword;
          }
        } else {
          // User signed up with Google, no current password to verify
          const hashedPassword = await hash(newPassword, 10);
          updates.password = hashedPassword;
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // Update user
    const updatedUsers = await db
      .update(user)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(user.id, session.user.id))
      .returning();

    // Update session with new user data
    if (updates.name) {
      session.user.name = updates.name;
    }
    if (updates.email) {
      session.user.email = updates.email;
    }

    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}