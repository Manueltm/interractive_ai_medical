// app/api/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { getPatients, createPatient, getUser } from "@/lib/db/queries";
import type { NewPatient } from "@/lib/db/schema";

export async function GET() {
  try {
    const patients = await getPatients();
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
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
    const body: NewPatient = await request.json();
    // Validate required fields
    if (!body.caseId || !body.name || !body.age || !body.condition) {
      return NextResponse.json({ error: "Missing required fields: caseId, name, age, condition" }, { status: 400 });
    }
    const created = await createPatient(body);
    return NextResponse.json(
      { data: created, message: "Patient created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}