//app/api/admin/token-packages/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { tokenPrice } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [pkg] = await db.select().from(tokenPrice).where(eq(tokenPrice.id, params.id));
    
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error("Error fetching token package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    
    const [updatedPackage] = await db
      .update(tokenPrice)
      .set({
        name: body.name,
        description: body.description,
        tokenAmount: body.tokenAmount,
        price: body.price,
        currency: body.currency,
      })
      .where(eq(tokenPrice.id, params.id))
      .returning();

    if (!updatedPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    return NextResponse.json({ package: updatedPackage });
  } catch (error) {
    console.error("Error updating token package:", error);
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
    
    const [updatedPackage] = await db
      .update(tokenPrice)
      .set({
        isActive: body.isActive,
      })
      .where(eq(tokenPrice.id, params.id))
      .returning();

    if (!updatedPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    
    return NextResponse.json({ package: updatedPackage });
  } catch (error) {
    console.error("Error updating token package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}