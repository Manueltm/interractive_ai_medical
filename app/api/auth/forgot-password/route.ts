import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, passwordResetToken } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../../../lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user
    const users = await db.select().from(user).where(eq(user.email, email));
    
    // Check if user exists
    if (users.length === 0) {
      return NextResponse.json({ 
        error: "Email does not exist on Acemedix Academy platform" 
      }, { status: 404 });
    }

    const existingUser = users[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Delete any existing tokens for this user
    await db.delete(passwordResetToken)
      .where(eq(passwordResetToken.userId, existingUser.id));

    // Create new token
    await db.insert(passwordResetToken).values({
      userId: existingUser.id,
      token,
      expires,
    });

    // Send email
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ 
      message: "Password reset link has been sent to your email" 
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}