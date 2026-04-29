//app/api/admin/usage-rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { tokenUsageRate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await db.select().from(tokenUsageRate).orderBy(tokenUsageRate.service);
    
    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Error fetching usage rates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const newRate = {
      id: uuidv4(),
      service: body.service,
      rate: body.rate,
      unit: body.unit,
      description: body.description,
      isActive: true,
    };

    await db.insert(tokenUsageRate).values(newRate);
    
    return NextResponse.json({ rate: newRate });
  } catch (error) {
    console.error("Error creating usage rate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}