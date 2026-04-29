import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, passwordResetToken } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hash } from "bcrypt-ts";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    // Find valid token
    const tokens = await db
      .select()
      .from(passwordResetToken)
      .where(
        and(
          eq(passwordResetToken.token, token),
          eq(passwordResetToken.used, false),
          gt(passwordResetToken.expires, new Date())
        )
      );

    if (tokens.length === 0) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const resetToken = tokens[0];

    // Hash new password
    const hashedPassword = await hash(password, 10);

    // Update user password
    await db
      .update(user)
      .set({ password: hashedPassword })
      .where(eq(user.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetToken)
      .set({ used: true })
      .where(eq(passwordResetToken.id, resetToken.id));

    return NextResponse.json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}