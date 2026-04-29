// app/api/main-mock-osce/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mainMockOSCE, academyCategory } from "@/lib/db/schema";
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
      whereConditions.push(eq(mainMockOSCE.categoryId, categoryId));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(mainMockOSCE)
      .where(whereClause || sql`1=1`);
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated items
    const items = await db
      .select({
        id: mainMockOSCE.id,
        osceName: mainMockOSCE.osceName,
        questionId: mainMockOSCE.questionId,
        question: mainMockOSCE.question,
        figureUrl: mainMockOSCE.figureUrl,
        explanation: mainMockOSCE.explanation,
        answer: mainMockOSCE.answer,
        isCorrect: mainMockOSCE.isCorrect,
        categoryId: mainMockOSCE.categoryId,
        createdAt: mainMockOSCE.createdAt,
        category: {
          id: academyCategory.id,
          name: academyCategory.name
        }
      })
      .from(mainMockOSCE)
      .leftJoin(academyCategory, eq(mainMockOSCE.categoryId, academyCategory.id))
      .where(whereClause || sql`1=1`)
      .orderBy(desc(mainMockOSCE.createdAt))
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
    console.error('Error fetching main mock OSCE:', error);
    return NextResponse.json({ error: 'Failed to fetch main mock OSCE' }, { status: 500 });
  }
}