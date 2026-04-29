import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { passwordResetToken } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

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

    return NextResponse.json({ valid: tokens.length > 0 });

  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}