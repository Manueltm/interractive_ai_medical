//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\app\api\departments\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { createDepartment, getDepartments, getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const departments = await getDepartments();
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUser(session.user.email || '');
    const userRole = users[0]?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { name, slug, isFlashcardDept = false, osceType = null } = await request.json();
    
    console.log('📝 Creating department:', { name, slug, isFlashcardDept, osceType }); // Debug log
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 });
    }

    // Validate osceType for non-flashcard departments
    if (!isFlashcardDept && !osceType) {
      return NextResponse.json(
        { error: 'osceType is required for OSCE departments. Must be clerking, counselling, or physical_exam' },
        { status: 400 }
      );
    }

    const existingDepartments = await getDepartments();

    // Check uniqueness with osceType
    const sameNameSameType = existingDepartments.find((d) => {
      if (isFlashcardDept) {
        return d.name.toLowerCase() === name.toLowerCase() && d.isFlashcardDept === true;
      } else {
        return (
          d.name.toLowerCase() === name.toLowerCase() &&
          d.isFlashcardDept === false &&
          d.osceType === osceType
        );
      }
    });
    
    if (sameNameSameType) {
      const type = isFlashcardDept ? 'flashcard' : `${osceType} department`;
      return NextResponse.json(
        { error: `${type} "${name}" already exists.` },
        { status: 400 }
      );
    }

    const duplicateSlug = existingDepartments.find(
      (d) => d.slug.toLowerCase() === slug.toLowerCase()
    );
    if (duplicateSlug) {
      return NextResponse.json(
        { error: `Slug "${slug}" is already taken.` },
        { status: 400 }
      );
    }

    const newDept = await createDepartment(
      name,
      slug,
      '#0077b6',
      '#ffffff',
      isFlashcardDept,
      osceType
    );

    console.log('✅ Department created:', newDept); // Debug log

    return NextResponse.json(
      { data: newDept, message: 'Department created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating department:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Department with this name or slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}