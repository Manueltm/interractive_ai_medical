// C:\Users\User\hume-voice-simulator\app\api\generate-exam-steps\route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { examStep } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from '@/lib/services/tokenService';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { condition, prompt, caseId } = await req.json();
    
    if (!condition || !caseId) {
      return NextResponse.json({ error: "Missing required fields: condition and caseId" }, { status: 400 });
    }

    // Add token check for exam step generation
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'exam_step_generation',
      1, // 1 token per step generation
      { 
        condition, 
        caseId,
        service: 'physical_exam_step_generation'
      }
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.message }, { status: 402 });
    }

    // Much more specific prompt
    const aiPrompt = `Patient presents with: "${condition}". ${prompt}

You MUST select ONLY from these EXACT step names - do NOT create variations or multiple versions:
- Introduction & Consent
- General Inspection  
- Vital Signs
- Palpation
- Percussion
- Auscultation
- Special Tests
- Gait Assessment
- Summary & Closure

Select EXACTLY 6-8 steps that are MOST RELEVANT for this specific case. 
Return ONLY the exact step names from the list above.
Do NOT add any prefixes, suffixes, or variations.
Do NOT generate more than 8 steps.

Return JSON: {"steps":["step1","step2",...]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: 0.1, // Lower temperature for more consistency
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message?.content ?? '';
    
    let steps: string[] = [];
    try {
      const parsed = JSON.parse(raw.replace(/```json?/, '').replace(/```/, '').trim());
      steps = parsed.steps || [];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to default steps if parsing fails
      steps = [
        'Introduction & Consent',
        'General Inspection',
        'Vital Signs',
        'Palpation', 
        'Auscultation',
        'Summary & Closure'
      ];
    }

    // Validate steps - ensure they only contain allowed values
    const allowedSteps = [
      'Introduction & Consent',
      'General Inspection',
      'Vital Signs', 
      'Palpation',
      'Percussion',
      'Auscultation',
      'Special Tests',
      'Gait Assessment',
      'Summary & Closure'
    ];

    // Filter to only allowed steps and limit to 8
    const validatedSteps = steps
      .filter((step: string) => allowedSteps.includes(step))
      .slice(0, 8);

    // If no valid steps, provide a default sequence
    const finalSteps = validatedSteps.length > 0 ? validatedSteps : [
      'Introduction & Consent',
      'General Inspection',
      'Vital Signs',
      'Palpation', 
      'Auscultation',
      'Summary & Closure'
    ];

    // video map
    const videoMap: Record<string, string> = {
      'Introduction & Consent': 'https://example.com/intro.mp4',
      'General Inspection': 'https://example.com/inspection.mp4',
      'Vital Signs': 'https://example.com/vitals.mp4',
      'Palpation': 'https://example.com/palpation.mp4',
      'Percussion': 'https://example.com/percussion.mp4',
      'Auscultation': 'https://example.com/auscultation.mp4',
      'Gait Assessment': 'https://example.com/gait.mp4',
      'Special Tests': 'https://example.com/special.mp4',
      'Summary & Closure': 'https://example.com/summary.mp4',
    };

    // Clear existing steps for this case first
    await db.delete(examStep).where(eq(examStep.caseId, caseId));

    // persist steps for this case
    for (let i = 0; i < finalSteps.length; i++) {
      await db.insert(examStep).values({
        caseId,
        stepOrder: i,
        name: finalSteps[i],
        videoUrl: videoMap[finalSteps[i]] ?? videoMap['Introduction & Consent'],
      });
    }

    // return to caller
    const rows = await db.select().from(examStep).where(eq(examStep.caseId, caseId)).orderBy(examStep.stepOrder);
    const examSteps = rows.map((r: any) => ({ name: r.name, videoUrl: r.videoUrl }));
    
    console.log(`Generated ${examSteps.length} steps for case ${caseId}:`, examSteps.map(s => s.name));
    
    return NextResponse.json({ steps: examSteps });
    
  } catch (error) {
    console.error("Error generating exam steps:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}