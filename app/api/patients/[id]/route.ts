// app/api/patients/[id]/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/(auth)/auth.config";
import { updatePatient, deletePatient, getUser } from "@/lib/db/queries";
import { getPatientById } from "@/lib/db/queries";


export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await getUser(session.user.email || '');
    const userRole = users[0]?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }
    const body = await request.json();
    const updated = await updatePatient(params.id, body);
    return NextResponse.json(
      { data: updated, message: "Patient updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const patient = await getPatientById(params.id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await getUser(session.user.email || '');
    if (users[0]?.role !== 'admin') return NextResponse.json({ error: "Admin required" }, { status: 403 });

    await deletePatient(params.id);
    return NextResponse.json({ message: "Patient deleted" }, { status: 200 });
  } catch (e) {
    console.error("Error deleting patient:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}