//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\api\cbt-feedback\route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
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

    // Add token check for CBT feedback
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'cbt_feedback',
      1,
      { service: 'cbt_session_feedback' }
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ 
        error: tokenCheck.message || "Insufficient tokens for feedback" 
      }, { status: 402 });
    }

    const { summaryMessages, correctAnswers, totalQuestions, unansweredQuestions, finalScore, mode } = await req.json();

    // FIXED: Use the provided finalScore instead of calculating it
    const answered = totalQuestions - unansweredQuestions;
    
    // Use the finalScore provided, or fallback to calculated percentage
    const percentageToShow = finalScore !== undefined ? finalScore : 
      (answered === 0 ? 0 : Math.round((correctAnswers / answered) * 100));

    let performanceLevel = '';
    let toneGuidance = '';

    if (unansweredQuestions === totalQuestions) {
      performanceLevel = 'no attempt';
      toneGuidance = `
The student did not attempt any of the questions. 
Provide warm, empathetic encouragement emphasizing that not answering is okay and can be improved with practice. 
Highlight the importance of engaging with questions, building confidence through participation, and taking small steps toward improvement. 
Reassure them that learning takes time and effort, and this is just the beginning of their journey.
`;
    } else if (percentageToShow === 100) {
      performanceLevel = 'excellent';
      toneGuidance = `
The student achieved a perfect score. 
Write a heartfelt, inspiring message celebrating their dedication and mastery. 
Acknowledge their effort and precision while encouraging humility and continuous growth. 
Keep the tone joyful, confident, and proud without exaggeration.
`;
    } else if (percentageToShow >= 80) {
      performanceLevel = 'high';
      toneGuidance = `
The student performed very well with a high score (${percentageToShow}%). 
Commend their strong understanding and consistent study habits. 
Encourage them to continue refining their knowledge and reviewing the few areas where they could still improve. 
Maintain a motivating, proud, and affirming tone.
`;
    } else if (percentageToShow >= 50) {
      performanceLevel = 'medium';
      toneGuidance = `
The student's performance is moderate (${percentageToShow}%). 
Recognize their effort and partial understanding, but suggest reviewing weaker topics more closely. 
Encourage perseverance, active revision, and consistent practice. 
Keep the feedback motivating and kind — focus on progress and growth, not shortcomings.
`;
    } else {
      performanceLevel = 'low';
      toneGuidance = `
The student scored low (${percentageToShow}%). 
Provide compassionate, encouraging feedback that recognizes their attempt and reinforces that mistakes are part of learning. 
Avoid criticism. Focus on hope, improvement, and resilience. 
Offer gentle advice such as reviewing fundamentals, pacing their study time, and practicing more questions. 
Use an empathetic, supportive mentor tone.
`;
    }

    // FIXED: Update the prompt to reference the correct scoring system
    const prompt = `
You are a compassionate and motivational medical-education AI tutor providing emotional yet insightful feedback to a student after an MCQ test.

Student Performance Summary:
- Total Questions: ${totalQuestions}
- Questions Attempted: ${answered}
- Correct Answers: ${correctAnswers}
- Final Score: ${percentageToShow}%
- Mode: ${mode || 'practice'}
- Performance Level: ${performanceLevel}

${['timed', 'exam'].includes(mode) ? `
IMPORTANT: This was a ${mode} mode session. The final score (${percentageToShow}%) is calculated based on ALL ${totalQuestions} questions, not just the attempted ones. This simulates real exam conditions where unanswered questions count against the score.
` : `
This was a practice mode session. The final score (${percentageToShow}%) is calculated based on attempted questions only, focusing on learning progress.
`}

${toneGuidance}

Additionally, integrate this summary context if relevant:
${summaryMessages}

Write one short, flowing paragraph (~120 words) that:
- Sounds human, personal, and emotionally intelligent.
- Mentions their final score explicitly (e.g., "You scored ${percentageToShow}%...").
- Acknowledges the scoring system if in timed/exam mode.
- Reflects on their progress and areas to strengthen.
- Ends with encouragement to keep learning and believing in themselves.

Avoid bullet points or robotic tone.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    return NextResponse.json({
      feedback: completion.choices[0].message.content?.trim() || '',
      percentage: percentageToShow,
      level: performanceLevel,
    });

  } catch (error) {
    console.error("CBT feedback error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}