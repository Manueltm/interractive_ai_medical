// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from "@/app/(auth)/auth";
// import { writeFile, mkdir } from 'fs/promises';
// import path from 'path';
// import { existsSync } from 'fs';

// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const formData = await req.formData();
//     const file = formData.get('file') as File;
    
//     if (!file) {
//       return NextResponse.json({ error: 'No file provided' }, { status: 400 });
//     }

//     // Validate file type
//     const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
//     if (!validTypes.includes(file.type)) {
//       return NextResponse.json({ error: 'Invalid file type. Please upload JPEG, PNG, WEBP, or GIF images only.' }, { status: 400 });
//     }

//     // Validate file size (max 5MB)
//     if (file.size > 5 * 1024 * 1024) {
//       return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
//     }

//     // Convert file to buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
    
//     // Generate unique filename
//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(2, 8);
//     const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const filename = `${timestamp}-${randomString}-${safeName}`;
    
//     // Ensure uploads directory exists
//     const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ads');
//     if (!existsSync(uploadDir)) {
//       await mkdir(uploadDir, { recursive: true });
//     }
    
//     // Save file
//     const filepath = path.join(uploadDir, filename);
//     await writeFile(filepath, buffer);
    
//     // Return the public URL
//     const url = `/uploads/ads/${filename}`;
    
//     return NextResponse.json({ url });
//   } catch (error) {
//     console.error('Upload error:', error);
//     return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `uploads/ads/${timestamp}-${randomString}-${safeName}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}