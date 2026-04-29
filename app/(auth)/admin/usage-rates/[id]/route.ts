import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { tokenUsageRate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const [updatedRate] = await db
      .update(tokenUsageRate)
      .set({
        service: body.service,
        rate: body.rate,
        unit: body.unit,
        description: body.description,
      })
      .where(eq(tokenUsageRate.id, params.id))
      .returning();

    if (!updatedRate) {
      return NextResponse.json({ error: "Usage rate not found" }, { status: 404 });
    }
    
    return NextResponse.json({ rate: updatedRate });
  } catch (error) {
    console.error("Error updating usage rate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const [updatedRate] = await db
      .update(tokenUsageRate)
      .set({
        isActive: body.isActive,
      })
      .where(eq(tokenUsageRate.id, params.id))
      .returning();

    if (!updatedRate) {
      return NextResponse.json({ error: "Usage rate not found" }, { status: 404 });
    }
    
    return NextResponse.json({ rate: updatedRate });
  } catch (error) {
    console.error("Error updating usage rate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}