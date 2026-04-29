//app/api/payments/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { payment, tokenPrice } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenPriceId } = await request.json();

    // Get token package
    const [packageData] = await db
      .select()
      .from(tokenPrice)
      .where(eq(tokenPrice.id, tokenPriceId));

    if (!packageData) {
      return NextResponse.json({ error: "Token package not found" }, { status: 404 });
    }

    // Create payment record
    const reference = `pay_${uuidv4()}`;
    const paymentData = {
  id: uuidv4(),
  userId: session.user.id,
  tokenPriceId,
  reference,
  amount: packageData.price,
  tokenAmount: packageData.tokenAmount,
  status: "pending" as const, // Add 'as const' to fix the type
};

    await db.insert(payment).values(paymentData);

    // Initialize Paystack payment
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: packageData.price,
        reference,
        callback_url: `${process.env.NEXTAUTH_URL}/dashboard/tokens?success=true`,
        metadata: {
          userId: session.user.id,
          tokenAmount: packageData.tokenAmount,
          custom_fields: [
            {
              display_name: "Token Package",
              variable_name: "token_package",
              value: packageData.name,
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    // Update payment with Paystack reference
    await db
      .update(payment)
      .set({ paystackReference: paystackData.data.reference })
      .where(eq(payment.reference, reference));

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}