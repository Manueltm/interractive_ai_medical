import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { examStep } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId parameter" }, { status: 400 });
    }

    const steps = await db
      .select()
      .from(examStep)
      .where(eq(examStep.caseId, caseId))
      .orderBy(examStep.stepOrder);

    const formattedSteps = steps.map((step) => ({
      name: step.name,
      videoUrl: step.videoUrl,
    }));

    return NextResponse.json({ steps: formattedSteps });
  } catch (error) {
    console.error("Error fetching exam steps:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}