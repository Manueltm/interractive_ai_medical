// app/api/mini-mock-cbt/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { miniMockCBT, academyCategory } from "@/lib/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '6');
    const categoryId = searchParams.get('categoryId');
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const whereConditions = [];
    if (categoryId && categoryId !== 'all') {
      whereConditions.push(eq(miniMockCBT.categoryId, categoryId));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(miniMockCBT)
      .where(whereClause || sql`1=1`);
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated items - single query without reassignment
    const items = await db
      .select({
        id: miniMockCBT.id,
        quizName: miniMockCBT.quizName,
        questionId: miniMockCBT.questionId,
        question: miniMockCBT.question,
        figureUrl: miniMockCBT.figureUrl,
        explanation: miniMockCBT.explanation,
        answer: miniMockCBT.answer,
        isCorrect: miniMockCBT.isCorrect,
        categoryId: miniMockCBT.categoryId,
        createdAt: miniMockCBT.createdAt,
        category: {
          id: academyCategory.id,
          name: academyCategory.name
        }
      })
      .from(miniMockCBT)
      .leftJoin(academyCategory, eq(miniMockCBT.categoryId, academyCategory.id))
      .where(whereClause || sql`1=1`)
      .orderBy(desc(miniMockCBT.createdAt))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Error fetching mini mock CBT:', error);
    return NextResponse.json({ error: 'Failed to fetch mini mock CBT' }, { status: 500 });
  }
}