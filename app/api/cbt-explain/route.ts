import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { TokenService } from "@/lib/services/tokenService";
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add token check
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'cbt_explanation',
      1,
      { service: 'cbt_ai_explanation' }
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ 
        error: tokenCheck.message || "Insufficient tokens for AI explanation" 
      }, { status: 402 });
    }

    const { question, selected, correct, explanation } = await req.json();

    console.log('📝 Request data for AI analysis:', { 
      questionLength: question?.length,
      selected, 
      correct,
      explanationLength: explanation?.length 
    });

    // **SWITCHED TO GPT-3.5 TURBO FOR FASTER, COST-EFFECTIVE RESPONSES**
    const model = process.env.OPENAI_GPT35_MODEL || 'gpt-3.5-turbo';

    const prompt = `You are a senior medical educator with perfect attention to detail.

QUESTION: "${question}"
STUDENT'S SELECTION: "${selected}"
CORRECT ANSWER: "${correct}"
PROVIDED EXPLANATION: "${explanation}"

YOUR MISSION: Provide structured, accurate clinical insights with perfect spelling and grammar.

RESPONSE FORMAT - USE EXACTLY THIS STRUCTURE:

ANALYSIS: Start with whether the student is correct or incorrect. Then provide 1-2 sentences explaining why based on specific medical facts. Use perfect English.

KEY CLINICAL INSIGHTS:
• [First specific clinical insight related to the question]
• [Second specific clinical insight with medical details]
• [Third specific insight about treatment/diagnosis]
• [Fourth insight about why incorrect options are wrong]
• [Fifth clinical pearl or memory aid]

CLINICAL RELEVANCE: Explain why this topic matters in real clinical practice. 1-2 sentences.

CRITICAL RULES:
1. NO TYPOS - Proofread your text
2. NO markdown formatting (** or ##)
3. Each bullet point must be specific to this medical topic
4. Reference actual drugs, conditions, mechanisms when relevant
5. Use proper medical terminology
6. Keep each section concise but informative

EXAMPLE FOR GASTROENTEROLOGY QUESTION:
ANALYSIS: The student is incorrect. H. pylori eradication requires combination therapy with a proton pump inhibitor and two antibiotics, not monotherapy with penicillin G which is ineffective against gram-negative bacteria.

KEY CLINICAL INSIGHTS:
• Standard H. pylori therapy: PPI + clarithromycin + amoxicillin/metronidazole for 10-14 days
• Bismuth quadruple therapy is alternative first-line in high resistance areas
• Penicillin G targets gram-positive bacteria and lacks efficacy against H. pylori
• Urea breath test is gold standard for diagnosis and test of cure
• Treatment failure often due to antibiotic resistance or poor compliance

CLINICAL RELEVANCE: Proper H. pylori eradication prevents peptic ulcer recurrence and reduces gastric cancer risk by 35-50%.

Now analyze the provided question and create clinical insights:`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'You are a meticulous medical professor. Your responses must have perfect spelling, grammar, and medical accuracy. Format exactly as requested. Be concise and focused.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Very low for consistent, accurate responses
      max_tokens: 600, // Reduced for faster responses (3.5-turbo is faster)
      frequency_penalty: 0.2, // Slightly reduced for speed
      presence_penalty: 0.2, // Slightly reduced for speed
    });

    let content = completion.choices[0]?.message?.content?.trim() || '';
    
    console.log('✅ AI Response length:', content.length);
    console.log('First 300 chars:', content.substring(0, 300));

    if (!content || content.length < 100) {
      throw new Error('AI returned insufficient content');
    }

    // Simple clean - just remove markdown if any
    const cleanedContent = content
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')
      .trim();

    return NextResponse.json({
      aiExplanation: cleanedContent,
      success: true,
      modelUsed: model, // Optional: track which model was used
    });

  } catch (error: any) {
    console.error('❌ AI Explanation API Error:', error.message || error);
    
    // Provide clean fallback without typos
    const fallbackExplanation = `ANALYSIS: This question assesses understanding of important medical concepts. Review the provided explanation for detailed feedback.

KEY CLINICAL INSIGHTS:
• Focus on understanding the core pathophysiology
• Review diagnostic criteria and evidence-based management
• Consider differential diagnoses and appropriate investigations
• Apply clinical decision-making frameworks
• Stay updated with current guidelines and best practices

CLINICAL RELEVANCE: Mastery of medical knowledge directly impacts patient outcomes and clinical decision-making.`;

    return NextResponse.json({
      aiExplanation: fallbackExplanation,
      fallbackUsed: true,
      success: true,
    });
  }
}