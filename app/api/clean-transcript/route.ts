// app/api/clean-transcript/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { aiClient } from "@/lib/services/aiClientService";

async function callAI(prompt: string) {
  const response = await aiClient.complete(prompt, {
    temperature: 0.1,
    maxTokens: 500,
  });
  
  return {
    choices: [{ message: { content: response.content } }]
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  let rawText: string = '';

  try {
    body = await request.json();
    rawText = body.rawText;
    
    const { role, context } = body;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ cleaned: '', shouldDiscard: true, reason: 'empty' });
    }

    const prompt = `You are a medical transcript processor. Clean and correct this voice-to-text output from a medical consultation.

**RAW TRANSCRIPT (${role === 'user' ? 'Doctor' : 'Patient'}):**
"${rawText}"

**CONTEXT:** ${context || 'Medical consultation'}

**YOUR TASK:**
1. Fix obvious ASR (Automatic Speech Recognition) errors
2. Correct medical terminology if clearly misheard (e.g., "cabicillin" → "antibiotic", "gab" → "")
3. Remove only true gibberish (random letters, test phrases like "test test")
4. Preserve all medical content, symptoms, and clinical details
5. Normalize punctuation and capitalization
6. Keep filler words (um, uh) if they sound natural - don't over-clean

**OUTPUT FORMAT - Return ONLY JSON:**
{
  "cleaned": "The cleaned transcript",
  "shouldDiscard": false,
  "confidence": "high|medium|low",
  "changes": ["brief description of what was fixed"],
  "isValidMedicalContent": true
}

**RULES:**
- If the text is clearly medical dialogue (symptoms, history, questions), keep it
- If it's pure nonsense (random characters, "test test"), mark shouldDiscard: true
- Never discard just because of poor grammar or accents
- Preserve medical terms even if spelled oddly - fix to proper spelling`;

    const response = await callAI(prompt);
    let content = response.choices[0].message.content || '';
    
    content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      result = {
        cleaned: rawText.trim().replace(/\s+/g, ' '),
        shouldDiscard: false,
        confidence: 'low',
        changes: ['parse_failed_returned_original'],
        isValidMedicalContent: true
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Transcript cleaning error:', error);
    return NextResponse.json({ 
      cleaned: rawText?.trim() || body?.rawText?.trim() || '',
      shouldDiscard: false,
      confidence: 'low',
      error: 'processing_failed'
    });
  }
}