// app/api/academy-categories/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { academyCategory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    const categories = await db
      .select({
        id: academyCategory.id,
        name: academyCategory.name,
        type: academyCategory.type,
        timeLimit: academyCategory.timeLimit, // Include timeLimit
        createdAt: academyCategory.createdAt
      })
      .from(academyCategory)
      .where(eq(academyCategory.type, type || ''))
      .orderBy(academyCategory.name);
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}