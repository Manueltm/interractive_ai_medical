//app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TokenService } from "@/lib/services/tokenService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    // Verify with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      return NextResponse.json({ error: verifyData.message }, { status: 400 });
    }

    // Find payment record using reference (not paystackReference)
    const [paymentRecord] = await db
      .select()
      .from(payment)
      .where(eq(payment.reference, reference));

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (paymentRecord.status === "completed") {
      return NextResponse.json({ 
        message: "Payment already verified", 
        status: "completed",
        tokenAmount: paymentRecord.tokenAmount 
      });
    }

    if (verifyData.data.status === "success") {
      // Update payment status
      await db
        .update(payment)
        .set({ status: "completed" })
        .where(eq(payment.reference, reference));

      // Add tokens to user
      const success = await TokenService.addTokens(
        paymentRecord.userId,
        paymentRecord.tokenAmount,
        "purchase",
        `Purchase: ${paymentRecord.tokenAmount} tokens`,
        paymentRecord.reference,
        {
          paymentId: paymentRecord.id,
          tokenPriceId: paymentRecord.tokenPriceId,
        }
      );

      if (!success) {
        console.error("Failed to add tokens for user:", paymentRecord.userId);
        return NextResponse.json({ error: "Failed to add tokens" }, { status: 500 });
      }

      // Get updated balance to return
      const updatedBalance = await TokenService.getUserBalance(paymentRecord.userId);

      return NextResponse.json({
        message: "Payment verified successfully",
        status: "completed",
        tokenAmount: paymentRecord.tokenAmount,
        newBalance: updatedBalance
      });
    } else {
      // Payment failed
      await db
        .update(payment)
        .set({ status: "failed" })
        .where(eq(payment.reference, reference));

      return NextResponse.json({
        message: "Payment failed",
        status: "failed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}