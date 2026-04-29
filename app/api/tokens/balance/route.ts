//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\tokens\balance\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await TokenService.getUserBalance(session.user.id);
    
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}