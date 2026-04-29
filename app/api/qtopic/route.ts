// app/api/qtopic/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qtopic } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const topic = searchParams.get('topic');

  try {
    let query = db
      .select({
        id: qtopic.id,
        category: qtopic.category,
        topic: qtopic.topic,
        question: qtopic.question,
        explanation: qtopic.explanation,
        figureUrl: qtopic.figureUrl,
        answer1: qtopic.answer1,
        answer2: qtopic.answer2,
        answer3: qtopic.answer3,
        answer4: qtopic.answer4,
        answer5: qtopic.answer5,
        correctAnswer: qtopic.correctAnswer,
        createdAt: qtopic.createdAt,
      })
      .from(qtopic);

    if (category) {
      query = query.where(eq(qtopic.category, category)) as any;
    }
    if (topic) {
      query = query.where(eq(qtopic.topic, topic)) as any;
    }
    
    const questions = await query.orderBy(desc(qtopic.createdAt));
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching qtopic questions:', error);
    return NextResponse.json({ error: 'Failed to fetch qtopic questions' }, { status: 500 });
  }
}