// app/api/public/usage-rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenUsageRate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const rates = await db.select()
      .from(tokenUsageRate)
      .where(eq(tokenUsageRate.isActive, true))
      .orderBy(tokenUsageRate.service);
    
    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Error fetching usage rates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}