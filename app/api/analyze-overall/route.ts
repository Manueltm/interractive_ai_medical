// C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\analyze-overall\route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PHYSICAL_CATEGORIES = [
  'Consent',
  'Introduction & Rapport',
  'General Inspection',
  'Vital Signs',
  'Specific System Examination',
  'Additional Tests',
  'Patient Comfort',
  'Summary of Findings',
];

function buildPhysicalPrompt(transcript: string): string {
  return `You are a strict OSCE examiner assessing a physical exam transcript.
Focus ONLY on STUDENT lines for scoring.

Marking rules (per category):
- 0   : completely absent
- 10  : present but poor / implied / minimal
- 20  : adequate and explicit with detail

Examples for Consent: 
- Score 10 (implied/poor): "Are you ready?", "Can we start?", "Shall we begin?"
- Score 20 (explicit/adequate): "Do I have your permission to examine you?", "May I proceed with the examination?"

Categories:
${PHYSICAL_CATEGORIES.map((c) => `- ${c}`).join('\n')}

CRITICAL: if "Consent" score = 0, total score = 0 % and rating = 1/5.

Transcript (STUDENT lines are doctor's speech, PATIENT are patient's):
${transcript}

TASK:
1. For each category, assign score (0 / 10 / 20) and evidence (exact STUDENT quote or "absent")
2. Compute TotalScore = sum(scores)
3. Percentage = (TotalScore / ${PHYSICAL_CATEGORIES.length * 20}) * 100
4. Rating = 1 if Percentage < 20; 2 < 40; 3 < 60; 4 < 80; 5 >= 80
5. If Consent = 0: Maximum rating = 1/5 and Percentage = 0

RETURN STRUCTURE:
- points_considered: Array of ALL categories with {category, score, evidence}
- strengths: Array of categories where score >= 15 (good performance)
- areas_of_improvement: Array of categories where score < 15 (needs improvement)
- suggestions: Actionable advice for each improvement area
- overall_assessment: Summary

Return JSON only, no other text:
{
  "rating": <int>,
  "percentage": <float>,
  "points_considered": [
    {"category": "str", "score": <num>, "evidence": "str"},
    ...
  ],
  "strengths": [
    {"category": "str", "score": <num>, "evidence": "str"},
    ...
  ],
  "areas_of_improvement": [
    {"category": "str", "score": <num>, "evidence": "str"},
    ...
  ],
  "suggestions": ["str1"],
  "overall_assessment": "<str>"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    const prompt = buildPhysicalPrompt(transcript);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    let result = response.choices[0]?.message?.content;
    if (!result) throw new Error('No AI response');
    result = result.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    return NextResponse.json(JSON.parse(result));
  } catch (e) {
    console.error('analyze-overall error:', e);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}