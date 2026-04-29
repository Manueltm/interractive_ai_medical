// app/api/analyze-physical-exam/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PHYSICAL_EXAM_CATEGORIES = [
  'Introduction & Consent',
  'General Inspection', 
  'Vital Signs',
  'System-Specific Examination',
  'Clinical Reasoning',
  'Patient Communication',
  'Professionalism',
  'Safety & Hygiene'
];

export async function POST(req: NextRequest) {
  try {
    const { stepFeedbacks, patientInfo } = await req.json();

    console.log('Physical Exam Analysis - Step Feedbacks:', stepFeedbacks);
    console.log('Patient Info:', patientInfo);

    // Calculate REAL overall score based on step scores
    const totalScore = stepFeedbacks.reduce((sum: number, step: any) => sum + (step.score || 0), 0);
    const maxPossibleScore = stepFeedbacks.length * 20;
    const calculatedPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    
    // Calculate rating based on percentage (much stricter)
    let calculatedRating = 1;
    if (calculatedPercentage >= 85) calculatedRating = 5;
    else if (calculatedPercentage >= 70) calculatedRating = 4;
    else if (calculatedPercentage >= 55) calculatedRating = 3;
    else if (calculatedPercentage >= 40) calculatedRating = 2;
    else calculatedRating = 1;

    console.log(`Calculated scores - Percentage: ${calculatedPercentage}%, Rating: ${calculatedRating}/5`);

    // Build comprehensive prompt for physical exam analysis
    const prompt = `You are a STRICT OSCE examiner analyzing a complete physical examination performance.
Be CRITICAL and REALISTIC. Do not be generous.

PATIENT CONTEXT:
- Name: ${patientInfo.name}
- Age: ${patientInfo.age}
- Gender: ${patientInfo.gender} 
- Condition: ${patientInfo.condition}

STEP-BY-STEP PERFORMANCE (SCORES OUT OF 20):
${stepFeedbacks.map((step: any, index: number) => 
  `Step ${index + 1}: ${step.stepName || `Step ${index + 1}`}
   Score: ${step.score || 0}/20
   Feedback: ${step.feedback || 'No specific feedback'}
   Evidence: ${step.evidence || 'No evidence provided'}`
).join('\n\n')}

CALCULATED OVERALL SCORE: ${calculatedPercentage}% (Rating: ${calculatedRating}/5)

YOUR TASK:
1. Use the calculated overall score above - do NOT invent a different score
2. Provide category-wise analysis using: ${PHYSICAL_EXAM_CATEGORIES.join(', ')}
3. Give SPECIFIC strengths with DIRECT evidence from step feedbacks
4. Give SPECIFIC improvements with ACTIONABLE advice
5. Provide realistic overall assessment

BE CRITICAL: If steps have low scores, reflect this in your analysis. Do not invent strengths that aren't supported by the step feedbacks.

CRITICAL: You MUST return ONLY valid JSON in this exact format:
{
  "rating": ${calculatedRating},
  "percentage": ${calculatedPercentage},
  "category_analysis": [
    {"category": "Category Name", "score": 0-10, "comment": "specific feedback based on step evidence"}
  ],
  "strengths": [
    {"category": "string", "score": "number", "evidence": "string from step feedback"}
  ],
  "improvements": [
    {"category": "string", "score": "number", "evidence": "string from step feedback"}  
  ],
  "suggestions": ["actionable suggestion 1", "suggestion 2"],
  "overall_assessment": "realistic 2-3 sentence summary based on actual performance",
  "step_summary": [
    {"step_name": "string", "score": "number", "key_findings": "string"}
  ]
}

IMPORTANT: Base everything on the ACTUAL step scores and feedbacks provided. Do not be generous.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a strict OSCE examiner. Always respond with valid JSON only, no additional text. Be critical and realistic.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Lower temperature for more consistent evaluation
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) throw new Error('No AI response');

    console.log('Raw AI overall response:', result);

    // Clean and parse JSON
    let cleaned = result;
    
    // Remove any code fences
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    } else if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```/, '').trim();
    }
    
    cleaned = cleaned.trim();
    
    // Check if it starts with non-JSON content
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      const firstBrace = cleaned.indexOf('{');
      if (firstBrace !== -1) {
        cleaned = cleaned.substring(firstBrace);
      }
    }

    try {
      const analysis = JSON.parse(cleaned);
      
      // ENFORCE the calculated scores - don't let AI override them
      analysis.rating = calculatedRating;
      analysis.percentage = calculatedPercentage;

      // Validate required fields
      if (!analysis.strengths) analysis.strengths = [];
      if (!analysis.improvements) analysis.improvements = [];
      if (!analysis.suggestions) analysis.suggestions = [];
      if (!analysis.overall_assessment) {
        analysis.overall_assessment = `Overall performance: ${calculatedPercentage}%. Based on step-by-step evaluation.`;
      }
      if (!analysis.step_summary) {
        analysis.step_summary = stepFeedbacks.map((step: any, index: number) => ({
          step_name: step.stepName || `Step ${index + 1}`,
          score: step.score || 0,
          key_findings: step.feedback || 'No specific feedback'
        }));
      }

      // Ensure category analysis reflects actual scores
      if (analysis.category_analysis) {
        analysis.category_analysis = analysis.category_analysis.map((cat: any) => {
          // Adjust category scores based on overall performance
          const adjustedScore = Math.round((calculatedPercentage / 100) * 10);
          return {
            ...cat,
            score: Math.min(cat.score || adjustedScore, adjustedScore)
          };
        });
      }

      console.log('Final analysis with enforced scores:', analysis);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Fallback analysis that uses calculated scores
      const fallbackAnalysis = {
        rating: calculatedRating,
        percentage: calculatedPercentage,
        category_analysis: PHYSICAL_EXAM_CATEGORIES.map(category => ({
          category,
          score: Math.round((calculatedPercentage / 100) * 10),
          comment: 'Performance based on step scores'
        })),
        strengths: [],
        improvements: stepFeedbacks.filter((step: any) => (step.score || 0) < 10)
          .map((step: any) => ({
            category: step.stepName || 'Examination',
            score: step.score || 0,
            evidence: step.feedback || 'Step needs improvement'
          })),
        suggestions: ['Review examination technique', 'Practice systematic approach'],
        overall_assessment: `Physical examination completed with ${calculatedPercentage}% overall score. Areas for improvement identified.`,
        step_summary: stepFeedbacks.map((step: any, index: number) => ({
          step_name: step.stepName || `Step ${index + 1}`,
          score: step.score || 0,
          key_findings: step.feedback || 'Step completed'
        }))
      };
      
      return NextResponse.json(fallbackAnalysis);
    }
  } catch (error) {
    console.error('Physical exam analysis error:', error);
    
    // Return a basic fallback
    const fallbackAnalysis = {
      rating: 1,
      percentage: 0,
      category_analysis: PHYSICAL_EXAM_CATEGORIES.map(category => ({
        category,
        score: 0,
        comment: 'Analysis unavailable'
      })),
      strengths: [],
      improvements: [],
      suggestions: ['Technical error during analysis'],
      overall_assessment: 'Analysis could not be completed due to technical issues.',
      step_summary: []
    };
    
    return NextResponse.json(fallbackAnalysis);
  }
}