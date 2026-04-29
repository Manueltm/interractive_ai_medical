// app/api/qtopic/topics/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qtopic } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }

  try {
    const topics = await db
      .select({
        topic: qtopic.topic,
        questionCount: sql<number>`count(*)`.mapWith(Number)
      })
      .from(qtopic)
      .where(eq(qtopic.category, category))
      .groupBy(qtopic.topic)
      .orderBy(qtopic.topic);
    
    return NextResponse.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}