//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\quiz-categories\route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizCategory, quizQuestion } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    // First, let's log what we're looking for
    console.log('Fetching categories with type:', type);

    // Get categories with question counts
    const categories = await db
      .select({
        id: quizCategory.id,
        name: quizCategory.name,
        type: quizCategory.type,
        createdAt: quizCategory.createdAt,
        questionCount: sql<number>`count(${quizQuestion.id})`.mapWith(Number)
      })
      .from(quizCategory)
      .leftJoin(quizQuestion, eq(quizCategory.id, quizQuestion.categoryId))
      .where(type ? eq(quizCategory.type, type) : sql`1=1`)
      .groupBy(quizCategory.id, quizCategory.name, quizCategory.type, quizCategory.createdAt)
      .orderBy(quizCategory.name);
    
    console.log(`Found ${categories.length} categories:`, categories.map(c => ({ name: c.name, type: c.type, count: c.questionCount })));
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching quiz categories:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz categories' }, { status: 500 });
  }
}