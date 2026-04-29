// app/api/analyze-step/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Update the return type to include strength
interface ConsentResult {
  hasConsent: boolean;
  evidence: string;
  strength: 'explicit' | 'weak' | 'none';
}

// Enhanced consent detection with stricter criteria
function detectConsentIntent(transcript: string): ConsentResult {
  const studentLines = transcript
    .split('\n')
    .filter(line => line.toUpperCase().startsWith('STUDENT:'))
    .map(line => line.replace(/^STUDENT:\s*/i, '').toLowerCase());

  // STRICTER consent indicators - must be explicit
  const explicitConsentPatterns = [
    /do i have your (?:permission|consent)/,
    /may i (?:examine|proceed|continue)/,
    /can i (?:examine|proceed|continue)/,
    /do you give consent/,
    /do you consent/,
    /may i have your consent/,
    /do you give permission/,
    /is it okay if i examine/,
    /would it be alright if i examine/,
    /do you mind if i examine/
  ];

  // WEAK consent indicators (score 10, not 20)
  const weakConsentPatterns = [
    /are you ready/,
    /shall we (?:start|begin)/,
    /can we (?:start|begin)/,
    /let's (?:start|begin)/,
    /ready to (?:start|begin)/,
    /i'd like to examine/
  ];

  for (const line of studentLines) {
    for (const pattern of explicitConsentPatterns) {
      if (pattern.test(line)) {
        return {
          hasConsent: true,
          evidence: line.trim(),
          strength: 'explicit'
        };
      }
    }
  }

  for (const line of studentLines) {
    for (const pattern of weakConsentPatterns) {
      if (pattern.test(line)) {
        return {
          hasConsent: true,
          evidence: line.trim(),
          strength: 'weak'
        };
      }
    }
  }

  return {
    hasConsent: false,
    evidence: "No consent request detected",
    strength: 'none'
  };
}

// Force ensure arrays are never empty
function ensureNonEmptyArrays(data: any, stepName: string) {
  return {
    score: data.score || 0,
    evidence: data.evidence || "No evidence available",
    strengths: (data.strengths && Array.isArray(data.strengths) && data.strengths.length > 0 && data.strengths[0] !== "") 
      ? data.strengths 
      : ["No specific strengths identified"],
    improvements: (data.improvements && Array.isArray(data.improvements) && data.improvements.length > 0 && data.improvements[0] !== "")
      ? data.improvements
      : ["Step not properly demonstrated"],
    suggestions: (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0 && data.suggestions[0] !== "")
      ? data.suggestions
      : ["Review and practice this examination step"],
    overall_assessment: data.overall_assessment || "Step requires improvement"
  };
}

export async function POST(req: NextRequest) {
  const { transcript, stepName } = await req.json();

  console.log(`Analyzing step: ${stepName}`);
  console.log(`Transcript length: ${transcript?.length || 0}`);

  // Check if transcript is too short or insufficient
  if (!transcript || transcript.trim().length < 30) {
    const result = {
      score: 0,
      evidence: "Insufficient conversation for analysis",
      strengths: ["No feedback - conversation too brief"],
      improvements: ["Demonstrate the step more thoroughly"],
      suggestions: ["Engage in proper dialogue for this examination step"],
      overall_assessment: "Step not adequately demonstrated - insufficient data"
    };
    
    return NextResponse.json(ensureNonEmptyArrays(result, stepName));
  }

  // Special STRICT handling for Introduction & Consent
  if (stepName === "Introduction & Consent") {
    const consentResult = detectConsentIntent(transcript);
    
    if (!consentResult.hasConsent) {
      const result = {
        score: 0,
        evidence: consentResult.evidence,
        strengths: ["No consent obtained"],
        improvements: ["Consent is compulsory - no explicit consent detected"],
        suggestions: [
          "Always ask for explicit consent: 'Do I have your permission to examine you?'",
          "Use clear language: 'May I proceed with the physical examination?'",
          "Ensure consent is obtained before beginning any examination"
        ],
        overall_assessment: "FAILED - Consent is mandatory and was not obtained"
      };
      return NextResponse.json(ensureNonEmptyArrays(result, stepName));
    } else if (consentResult.strength === 'weak') {
      const result = {
        score: 10,
        evidence: consentResult.evidence,
        strengths: ["Implied consent attempted"],
        improvements: ["Consent should be explicit, not implied"],
        suggestions: [
          "Use explicit consent language: 'Do I have your permission to examine you?'",
          "Avoid casual language like 'Are you ready?' for consent"
        ],
        overall_assessment: "Partial credit - consent was implied but should be explicit"
      };
      return NextResponse.json(ensureNonEmptyArrays(result, stepName));
    }
    // If we get here, explicit consent was detected - let AI evaluate further
  }

  // STRICTER prompt for all steps
  const prompt = `You are a STRICT OSCE examiner marking the step "${stepName}" in a physical exam.
Evaluate ONLY the STUDENT lines. Be CRITICAL and REALISTIC.

STRICT Scoring Criteria:
- 0  → step completely absent, wrong, or dangerously incorrect
- 5  → step barely mentioned with major errors or omissions
- 10 → step partially attempted but with significant deficiencies
- 15 → step performed adequately but with minor errors
- 20 → step performed excellently with proper technique and communication

For examination steps, consider:
- Proper technique description
- Systematic approach
- Patient communication
- Safety considerations
- Medical accuracy

Be VERY CRITICAL. If the student just made small talk without demonstrating the step, score LOW.

Transcript to analyze:
${transcript}

Provide HONEST assessment:
- score (0-20)
- evidence (specific quote or "step not demonstrated")
- strengths (be critical - if none, say so)
- improvements (be specific about what was missing)
- suggestions (actionable advice)
- overall_assessment (1-2 sentences, be direct)

CRITICAL: Do not be generous. Base score strictly on what was actually said.

Return JSON only:
{"score":<0-20>,"evidence":"<str>","strengths":["str"],"improvements":["str"],"suggestions":["str"],"overall_assessment":"<str>"}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Lower temperature for more consistent scoring
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    
    console.log('AI Step Analysis Raw:', raw);

    // Clean and parse JSON
    let cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      
      // Additional validation for consent step
      if (stepName === "Introduction & Consent") {
        const consentResult = detectConsentIntent(transcript);
        if (!consentResult.hasConsent && parsed.score > 0) {
          console.log('Overriding AI consent score - no consent detected');
          parsed.score = 0;
          parsed.evidence = "No explicit consent detected";
          parsed.improvements = ["Consent is compulsory - no consent detected"];
          parsed.suggestions = ["Always ask for explicit consent before examination"];
        } else if (consentResult.strength === 'weak' && parsed.score > 10) {
          console.log('Adjusting consent score - weak consent should not score high');
          parsed.score = Math.min(parsed.score, 10);
        }
      }

      // Cap scores if conversation is too brief for the step
      const wordCount = transcript.split(/\s+/).length;
      if (wordCount < 50 && parsed.score > 10) {
        console.log('Adjusting score downward - conversation too brief');
        parsed.score = Math.min(parsed.score, 10);
        if (!parsed.overall_assessment.includes('brief')) {
          parsed.overall_assessment += " Conversation was too brief for proper evaluation.";
        }
      }
      
      const result = ensureNonEmptyArrays(parsed, stepName);
      console.log(`Final step score: ${result.score}/20`);
      return NextResponse.json(result);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Return strict default for parse errors
      const result = {
        score: 0,
        evidence: "Analysis error - step not properly evaluated",
        strengths: ["No evaluation possible"],
        improvements: ["Technical error during analysis"],
        suggestions: ["Please demonstrate the step clearly"],
        overall_assessment: "Unable to analyze - step may not have been properly demonstrated"
      };
      return NextResponse.json(ensureNonEmptyArrays(result, stepName));
    }
  } catch (error) {
    console.error('analyze-step error:', error);
    
    // Strict fallback for errors
    const result = {
      score: 0,
      evidence: "Technical analysis failure",
      strengths: ["Analysis unavailable"],
      improvements: ["System error during evaluation"],
      suggestions: ["Please try the step again"],
      overall_assessment: "Analysis failed - step completion uncertain"
    };
    return NextResponse.json(ensureNonEmptyArrays(result, stepName));
  }
}