//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\tokens\deduct\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";

// In app/api/tokens/deduct/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { service, quantity, metadata } = await request.json();

    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      service,
      quantity,
      metadata
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ 
        error: tokenCheck.message 
      }, { status: 402 });
    }

    // Dispatch event with the new balance
    if (tokenCheck.newBalance !== undefined) {
      // This will only work on the client side, but that's where we need it
      return NextResponse.json({ 
        success: true, 
        transactionId: tokenCheck.transactionId,
        newBalance: tokenCheck.newBalance,
        message: "Tokens deducted successfully"
      });
    }

    return NextResponse.json({ 
      success: true, 
      transactionId: tokenCheck.transactionId,
      message: "Tokens deducted successfully"
    });
  } catch (error) {
    console.error("Error deducting tokens:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}