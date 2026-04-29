import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, amount, reason } = await request.json();

    if (!userId || !amount || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const success = await TokenService.addTokens(
      userId,
      amount,
      'reward',
      `Admin assignment: ${reason}`,
      `admin_assign_${Date.now()}`,
      { assignedBy: session.user.id, reason }
    );

    if (!success) {
      return NextResponse.json({ error: "Failed to assign tokens" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Tokens assigned successfully",
      amount,
      userId 
    });
  } catch (error) {
    console.error("Error assigning tokens:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}