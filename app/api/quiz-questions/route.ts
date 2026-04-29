//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\quiz-questions\route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizQuestion, quizCategory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    console.log('Fetching questions for categoryId:', categoryId);

    // First, verify the category exists
    if (categoryId) {
      const category = await db
        .select()
        .from(quizCategory)
        .where(eq(quizCategory.id, categoryId))
        .limit(1);
      
      console.log('Category found:', category[0]);
    }

    const questions = await db
      .select({
        id: quizQuestion.id,
        content: quizQuestion.content,
        answer1: quizQuestion.answer1,
        answer2: quizQuestion.answer2,
        answer3: quizQuestion.answer3,
        answer4: quizQuestion.answer4,
        correctAnswer: quizQuestion.correctAnswer,
        figureUrl: quizQuestion.figureUrl,
        explanation: quizQuestion.explanation,
        categoryId: quizQuestion.categoryId,
        createdAt: quizQuestion.createdAt,
        category: {
          id: quizCategory.id,
          name: quizCategory.name,
          type: quizCategory.type
        }
      })
      .from(quizQuestion)
      .leftJoin(quizCategory, eq(quizQuestion.categoryId, quizCategory.id))
      .where(categoryId ? eq(quizQuestion.categoryId, categoryId) : undefined);
    
    console.log(`Found ${questions.length} questions`);
    if (questions.length > 0) {
      console.log('First question sample:', {
        id: questions[0].id,
        content: questions[0].content.substring(0, 50),
        hasFigure: !!questions[0].figureUrl,
        figureUrl: questions[0].figureUrl,
        categoryType: questions[0].category?.type
      });
      
      // Log how many have images
      const withImages = questions.filter(q => q.figureUrl).length;
      console.log(`Questions with images: ${withImages}/${questions.length}`);
    }
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
  }
}