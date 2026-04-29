//app/api/tokens/packages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/services/tokenService";

export async function GET(request: NextRequest) {
  try {
    const packages = await TokenService.getTokenPackages();
    
    return NextResponse.json({ packages });
  } catch (error) {
    console.error("Error fetching token packages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}