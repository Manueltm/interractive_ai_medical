// app/api/clinchers/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clincher, academyCategory } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const clinchers = await db
      .select({
        id: clincher.id,
        question: clincher.question,
        answer: clincher.answer,
        mainFigureUrl: clincher.mainFigureUrl,
        categoryId: clincher.categoryId,
        extraQuestion1: clincher.extraQuestion1,
        extraQuestion2: clincher.extraQuestion2,
        extraQuestion3: clincher.extraQuestion3,
        extraQuestion4: clincher.extraQuestion4,
        extraQuestion5: clincher.extraQuestion5,
        extraQuestion6: clincher.extraQuestion6,
        extraQuestion7: clincher.extraQuestion7,
        extraAnswer1: clincher.extraAnswer1,
        extraAnswer2: clincher.extraAnswer2,
        extraAnswer3: clincher.extraAnswer3,
        extraAnswer4: clincher.extraAnswer4,
        extraAnswer5: clincher.extraAnswer5,
        extraAnswer6: clincher.extraAnswer6,
        extraAnswer7: clincher.extraAnswer7,
        createdAt: clincher.createdAt,
        category: {
          id: academyCategory.id,
          name: academyCategory.name
        }
      })
      .from(clincher)
      .leftJoin(academyCategory, eq(clincher.categoryId, academyCategory.id))
      .orderBy(desc(clincher.createdAt));
    
    return NextResponse.json(clinchers);
  } catch (error) {
    console.error('Error fetching clinchers:', error);
    return NextResponse.json({ error: 'Failed to fetch clinchers' }, { status: 500 });
  }
}