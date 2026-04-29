import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { tokenPrice } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packages = await db.select().from(tokenPrice).orderBy(tokenPrice.tokenAmount);
    
    return NextResponse.json({ packages });
  } catch (error) {
    console.error("Error fetching token packages:", error);
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
    
    const newPackage = {
      id: uuidv4(),
      name: body.name,
      description: body.description,
      tokenAmount: body.tokenAmount,
      price: body.price,
      currency: body.currency || 'NGN',
      isActive: true,
    };

    await db.insert(tokenPrice).values(newPackage);
    
    return NextResponse.json({ package: newPackage });
  } catch (error) {
    console.error("Error creating token package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}