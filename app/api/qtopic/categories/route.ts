// app/api/qtopic/categories/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qtopic } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Get unique categories with topic counts
    const categories = await db
      .select({
        category: qtopic.category,
        topicCount: sql<number>`count(distinct ${qtopic.topic})`.mapWith(Number),
        questionCount: sql<number>`count(*)`.mapWith(Number)
      })
      .from(qtopic)
      .groupBy(qtopic.category)
      .orderBy(qtopic.category);
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}