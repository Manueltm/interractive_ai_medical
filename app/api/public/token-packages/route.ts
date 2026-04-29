// app/api/public/token-packages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenPrice } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const packages = await db.select()
      .from(tokenPrice)
      .where(eq(tokenPrice.isActive, true))
      .orderBy(tokenPrice.tokenAmount);
    
    return NextResponse.json({ packages });
  } catch (error) {
    console.error("Error fetching token packages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}