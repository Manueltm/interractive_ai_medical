// app/api/hint-fast/route.ts
// Only call this when rule-based can't determine (optional fallback)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, context, department, condition } = await request.json();
    
    // Only used for complex cases - simple prompt, fast response
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Fast and cheap
      messages: [
        {
          role: 'system',
          content: `You are an OSCE hint system. Give ONE short hint (max 50 chars) for a medical student in ${department} with patient having ${condition}. Be specific and actionable. Return JSON: {"message":"hint","suggestion":"example phrase"}`
        },
        {
          role: 'user',
          content: `Student said: "${text}". Current context: ${context}. Give hint.`
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    
    const content = response.choices[0].message.content || '';
    const hint = JSON.parse(content);
    
    return NextResponse.json(hint);
  } catch (error) {
    return NextResponse.json({ 
      message: "Continue with your history taking",
      suggestion: "Ask about their main concern"
    });
  }
}