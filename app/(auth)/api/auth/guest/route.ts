import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/";

  // Redirect to the login page with ?guest=1
  const loginUrl = `/login?guest=1&callbackUrl=${encodeURIComponent(redirectUrl)}`;
  return NextResponse.redirect(loginUrl);
}
