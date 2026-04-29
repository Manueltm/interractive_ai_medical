// app/api/admin/initialize-smart-service/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { tokenUsageRate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const smartServiceRate = {
      id: uuidv4(),
      service: 'smart_question_generation',
      rate: 5, // 5 tokens per generation
      unit: 'generation',
      description: 'AI-powered smart question generation from text/documents',
      isActive: true,
    };

    // Check if service already exists
    const [existing] = await db
      .select()
      .from(tokenUsageRate)
      .where(eq(tokenUsageRate.service, 'smart_question_generation'));

    if (existing) {
      await db
        .update(tokenUsageRate)
        .set({
          rate: 5,
          unit: 'generation',
          description: 'AI-powered smart question generation from text/documents',
          isActive: true,
        })
        .where(eq(tokenUsageRate.service, 'smart_question_generation'));
    } else {
      await db.insert(tokenUsageRate).values(smartServiceRate);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Smart question generation service rate added' 
    });
  } catch (error) {
    console.error("Error initializing smart service:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}