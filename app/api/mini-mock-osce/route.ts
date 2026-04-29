// app/api/mini-mock-osce/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { miniMockOSCE, academyCategory } from "@/lib/db/schema";
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
      whereConditions.push(eq(miniMockOSCE.categoryId, categoryId));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(miniMockOSCE)
      .where(whereClause || sql`1=1`);
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated items
    const items = await db
      .select({
        id: miniMockOSCE.id,
        osceName: miniMockOSCE.osceName,
        questionId: miniMockOSCE.questionId,
        question: miniMockOSCE.question,
        figureUrl: miniMockOSCE.figureUrl,
        correctAnswers: miniMockOSCE.correctAnswers,
        categoryId: miniMockOSCE.categoryId,
        createdAt: miniMockOSCE.createdAt,
        category: {
          id: academyCategory.id,
          name: academyCategory.name
        }
      })
      .from(miniMockOSCE)
      .leftJoin(academyCategory, eq(miniMockOSCE.categoryId, academyCategory.id))
      .where(whereClause || sql`1=1`)
      .orderBy(desc(miniMockOSCE.createdAt))
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
    console.error('Error fetching mini mock OSCE:', error);
    return NextResponse.json({ error: 'Failed to fetch mini mock OSCE' }, { status: 500 });
  }
}