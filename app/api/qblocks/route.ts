// app/api/qblocks/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qblock, academyCategory } from "@/lib/db/schema";
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
      whereConditions.push(eq(qblock.categoryId, categoryId));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(qblock)
      .where(whereClause || sql`1=1`);
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated items
    const items = await db
      .select({
        id: qblock.id,
        question: qblock.question,
        quizName: qblock.quizName,
        answer1: qblock.answer1,
        answer2: qblock.answer2,
        answer3: qblock.answer3,
        answer4: qblock.answer4,
        correctAnswer: qblock.correctAnswer,
        categoryId: qblock.categoryId,
        createdAt: qblock.createdAt,
        category: {
          id: academyCategory.id,
          name: academyCategory.name
        }
      })
      .from(qblock)
      .leftJoin(academyCategory, eq(qblock.categoryId, academyCategory.id))
      .where(whereClause || sql`1=1`)
      .orderBy(desc(qblock.createdAt))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + items.length < total
    });
    
  } catch (error) {
    console.error('Error fetching qblocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch qblocks' }, 
      { status: 500 }
    );
  }
}