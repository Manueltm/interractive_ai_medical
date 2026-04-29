// app/api/messages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { getMessagesByChat, saveMessage } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
  try {
    const messages = await getMessagesByChat(chatId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received message body:', body);
    
    // Validate required fields
    if (!body.chatId || !body.role || !body.content) {
      console.log('Missing fields:', { 
        chatId: body.chatId, 
        role: body.role, 
        content: body.content 
      });
      return NextResponse.json({ 
        error: 'Missing fields', 
        required: ['chatId', 'role', 'content'],
        received: { 
          chatId: !!body.chatId, 
          role: !!body.role, 
          content: !!body.content 
        }
      }, { status: 400 });
    }

    // Validate role
    if (body.role !== 'student' && body.role !== 'patient') {
      return NextResponse.json({ 
        error: 'Invalid role. Must be "student" or "patient"' 
      }, { status: 400 });
    }

    // Ensure chatId is a string (it should be, but just to be safe)
    const chatId = String(body.chatId);
    
    const messageData = {
      id: crypto.randomUUID(),
      chatId: chatId,
      role: body.role,
      content: body.content,
      attachments: null,
      createdAt: new Date(),
    };
    
    console.log('Prepared message data:', messageData);
    
    const savedMessage = await saveMessage(messageData);

    return NextResponse.json({ 
      success: true, 
      message: savedMessage 
    });
    
  } catch (e) {
    console.error('Save message error:', e);
    return NextResponse.json({ 
      error: 'Server error', 
      details: e instanceof Error ? e.message : 'Unknown error' 
    }, { status: 500 });
  }
}