import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";
import { updateChat } from "@/lib/db/queries";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actualDurationInSeconds, endedEarly, reason } = await request.json();
    const chatId = params.id;

    if (!actualDurationInSeconds || actualDurationInSeconds <= 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Calculate tokens based on actual duration (0.05 per second)
    const tokensToDeduct = Math.ceil(actualDurationInSeconds * 0.05);

    // Check current balance before deducting
    const currentBalance = await TokenService.getUserBalance(session.user.id);
    
    if (currentBalance < tokensToDeduct) {
      // If insufficient tokens, use whatever is available
      const actualDeduction = Math.max(0, currentBalance);
      
      await TokenService.deductTokens(
        session.user.id,
        'voice_chat_session',
        actualDeduction / 0.05, // Convert back to seconds for the quantity
        { 
          chatId,
          actualDurationInSeconds,
          intendedDeduction: tokensToDeduct,
          actualDeduction: actualDeduction,
          reason: 'insufficient_balance_at_end'
        }
      );

      return NextResponse.json({ 
        success: true, 
        tokensDeducted: actualDeduction,
        intendedDeduction: tokensToDeduct,
        actualDuration: actualDurationInSeconds,
        endedEarly: true,
        reason: 'insufficient_tokens',
        message: `Session ended. Only ${actualDeduction} tokens were available (needed ${tokensToDeduct}).`
      });
    }

    // Normal deduction if sufficient tokens
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'voice_chat_session',
      actualDurationInSeconds, // Quantity in seconds
      { 
        chatId,
        actualDurationInSeconds,
        endedEarly: endedEarly || false,
        reason: reason || 'normal_completion'
      }
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ 
        error: tokenCheck.message || "Token deduction failed" 
      }, { status: 402 });
    }

    // Update chat status to completed
    await updateChat(chatId, {
      status: 'completed'
    });

    return NextResponse.json({ 
      success: true, 
      tokensDeducted: tokensToDeduct,
      actualDuration: actualDurationInSeconds,
      endedEarly: endedEarly || false,
      message: "Session ended successfully and tokens deducted based on actual usage"
    });

  } catch (error) {
    console.error("Error ending chat session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}