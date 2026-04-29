// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { db } from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/settings - Get current admin settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the first settings record (there should only be one)
    let settings = await db.query.adminSettings.findFirst();
    
    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await db.insert(adminSettings).values({
        showChiefComplaint: true,
        showPresentingCondition: true,
        departmentSelectionMode: 'allow_select',
        selectedDepartmentCount: 3,
        allowUserDepartmentChoice: false,
        updatedBy: session.user.id,
      }).returning();
      
      settings = newSettings;
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Update admin settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      showChiefComplaint, 
      showPresentingCondition,
      departmentSelectionMode, 
      selectedDepartmentCount,
      allowUserDepartmentChoice 
    } = body;
    
    // Get existing settings
    const existingSettings = await db.query.adminSettings.findFirst();
    
    if (!existingSettings) {
      // Create new settings if none exist
      const [newSettings] = await db.insert(adminSettings).values({
        showChiefComplaint: showChiefComplaint ?? true,
        showPresentingCondition: showPresentingCondition ?? true,
        departmentSelectionMode: departmentSelectionMode ?? 'allow_select',
        selectedDepartmentCount: selectedDepartmentCount ?? 3,
        allowUserDepartmentChoice: allowUserDepartmentChoice ?? false,
        updatedBy: session.user.id,
      }).returning();
      
      return NextResponse.json(newSettings);
    }
    
    // Update existing settings
    const updateData: any = {
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    
    if (showChiefComplaint !== undefined) updateData.showChiefComplaint = showChiefComplaint;
    if (showPresentingCondition !== undefined) updateData.showPresentingCondition = showPresentingCondition;
    if (departmentSelectionMode !== undefined) updateData.departmentSelectionMode = departmentSelectionMode;
    if (selectedDepartmentCount !== undefined) {
      updateData.selectedDepartmentCount = Math.min(10, Math.max(1, selectedDepartmentCount));
    }
    if (allowUserDepartmentChoice !== undefined) updateData.allowUserDepartmentChoice = allowUserDepartmentChoice;
    
    const [updatedSettings] = await db
      .update(adminSettings)
      .set(updateData)
      .where(eq(adminSettings.id, existingSettings.id))
      .returning();
    
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}