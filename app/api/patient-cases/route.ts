// C:\Users\User\hume-voice-simulator\app\api\patient-cases\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getPatientCases, createPatientCase, getUser } from "@/lib/db/queries";
import type { NewPatientCase } from "@/lib/db/schema";

export async function GET() {
  try {
    const cases = await getPatientCases();
    return NextResponse.json(cases);
  } catch (error) {
    console.error("Error fetching patient cases:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Fetch user role from DB to ensure it's up-to-date
    const users = await getUser(session.user.email || '');
    const userRole = users[0]?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }
    const body: NewPatientCase = await request.json();
    // Validate required fields
    if (!body.departmentId || !body.title || !body.description || !body.sessionType) {
      return NextResponse.json({ error: "Missing required fields: departmentId, title, description, sessionType" }, { status: 400 });
    }
    const created = await createPatientCase(body);
    return NextResponse.json(
      { data: created, message: "Patient case created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating patient case:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}