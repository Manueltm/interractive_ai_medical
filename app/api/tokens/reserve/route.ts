//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\tokens\reserve\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { service, maxQuantity, metadata } = await request.json();

    const reservation = await TokenService.reserveTokens(
      session.user.id,
      service,
      maxQuantity
    );

    if (!reservation.success) {
      return NextResponse.json({ 
        error: reservation.message 
      }, { status: 402 });
    }

    return NextResponse.json({ 
      success: true,
      reservedAmount: reservation.reservedAmount,
      message: reservation.message
    });
  } catch (error) {
    console.error("Error reserving tokens:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}