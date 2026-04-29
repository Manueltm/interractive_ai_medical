// app/api/main-mock-cbt/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mainMockCBT, academyCategory } from "@/lib/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";

// app/api/main-mock-cbt/route.ts - Optimized version
export async function GET(request: Request) {
    const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '6');
    const categoryId = searchParams.get('categoryId');
    
    const offset = (page - 1) * limit;
    
    // Single optimized query with count
    const [countResult, items] = await Promise.all([
      // Get total count
      db.select({ count: sql<number>`count(*)` })
        .from(mainMockCBT)
        .where(categoryId && categoryId !== 'all' 
          ? eq(mainMockCBT.categoryId, categoryId) 
          : sql`1=1`),
      
      // Get paginated items with joins
      db.select({
        id: mainMockCBT.id,
        quizName: mainMockCBT.quizName,
        questionId: mainMockCBT.questionId,
        question: mainMockCBT.question,
        figureUrl: mainMockCBT.figureUrl,
        explanation: mainMockCBT.explanation,
        answer: mainMockCBT.answer,
        isCorrect: mainMockCBT.isCorrect,
        categoryId: mainMockCBT.categoryId,
        createdAt: mainMockCBT.createdAt,
        categoryName: academyCategory.name
      })
      .from(mainMockCBT)
      .leftJoin(academyCategory, eq(mainMockCBT.categoryId, academyCategory.id))
      .where(categoryId && categoryId !== 'all' 
        ? eq(mainMockCBT.categoryId, categoryId) 
        : sql`1=1`)
      .orderBy(desc(mainMockCBT.createdAt))
      .limit(limit)
      .offset(offset)
    ]);
    
    const total = Number(countResult[0]?.count || 0);
    
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}