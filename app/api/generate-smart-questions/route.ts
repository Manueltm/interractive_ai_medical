// app/api/generate-smart-questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import OpenAI from "openai";
import { TokenService } from "@/lib/services/tokenService";

// Initialize OpenAI
export const dynamic = 'force-dynamic';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const text = formData.get('text') as string;
    const file = formData.get('file') as File;
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 10;
    const duration = parseInt(formData.get('duration') as string) || 60;

    console.log('🤖 Smart question generation requested');
    console.log('📝 Parameters:', {
      textLength: text?.length || 0,
      file: !!file,
      numQuestions,
      duration
    });

    // Token check first
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'smart_question_generation',
      5,
      { 
        service: 'smart_question_generation',
        numQuestions,
        duration
      }
    );

    if (!tokenCheck.success) {
      return NextResponse.json({ 
        success: false,
        error: tokenCheck.message || "Insufficient tokens" 
      }, { status: 402 });
    }

    // Basic validation
    if (!text && !file) {
      return NextResponse.json(
        { 
          success: false,
          error: "Please provide text or upload a document" 
        },
        { status: 400 }
      );
    }

    if (text && text.length > 10000) {
      return NextResponse.json(
        { 
          success: false,
          error: "Text input exceeds 10,000 characters limit" 
        },
        { status: 400 }
      );
    }

    if (numQuestions < 1 || numQuestions > 50) {
      return NextResponse.json(
        { 
          success: false,
          error: "Number of questions must be between 1 and 50" 
        },
        { status: 400 }
      );
    }

    if (duration < 1 || duration > 300) {
      return NextResponse.json(
        { 
          success: false,
          error: "Duration must be between 1 and 300 minutes" 
        },
        { status: 400 }
      );
    }

    // Process the text/file
    let content = text || '';
    
    if (file) {
      try {
        const fileContent = await file.text();
        content += `\n\n${fileContent.substring(0, 10000)}`;
      } catch (error) {
        console.error('Error reading file:', error);
        return NextResponse.json(
          { 
            success: false,
            error: "Failed to read uploaded file. Please ensure it's a valid text, PDF, DOC, or DOCX file." 
          },
          { status: 400 }
        );
      }
    }

    if (content.trim().length < 50) {
      return NextResponse.json(
        { 
          success: false,
          error: "Content is too short. Please provide more detailed medical content." 
        },
        { status: 400 }
      );
    }

    console.log('📊 Content length:', content.length);
    console.log('📊 First 200 chars:', content.substring(0, 200));

    // Call OpenAI to generate questions
    try {
      const generatedQuestions = await generateAIQuestions(content, numQuestions);
      
      // Validate generated questions
      if (!generatedQuestions || generatedQuestions.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Failed to generate any valid questions. Please try again with different content.",
          questions: []
        }, { status: 500 });
      }
      
      if (generatedQuestions.length < Math.min(numQuestions, 3)) {
        console.warn(`⚠️ Only generated ${generatedQuestions.length} questions out of requested ${numQuestions}`);
        
        return NextResponse.json({
          success: true,
          questions: generatedQuestions,
          numQuestions: generatedQuestions.length,
          requestedQuestions: numQuestions,
          duration: duration,
          warning: `Generated ${generatedQuestions.length} questions instead of ${numQuestions}. The content may not have enough information for more questions.`,
          message: `Generated ${generatedQuestions.length} questions for a ${duration}-minute session`
        });
      }

      return NextResponse.json({
        success: true,
        questions: generatedQuestions,
        numQuestions: generatedQuestions.length,
        requestedQuestions: numQuestions,
        duration: duration,
        message: `Successfully generated ${generatedQuestions.length} questions for a ${duration}-minute session`
      });

    } catch (aiError: any) {
      console.error("❌ AI Generation Error:", aiError);
      
      return NextResponse.json({
        success: false,
        error: "Unable to generate questions at this time. Please try again later or with different content.",
        details: "AI service temporarily unavailable",
        questions: []
      }, { status: 503 });
    }

   } catch (error: any) {
    console.error("❌ System Error generating smart questions:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "System error. Please try again later.",
        details: error.message,
        questions: []
      },
      { status: 500 }
    );
  }
}

async function generateAIQuestions(content: string, numQuestions: number = 10) {
  try {
    // Adjust prompt based on number of questions
    const questionCount = Math.min(numQuestions, 30);
    const contentLimit = Math.min(content.length, 6000);
    
    const prompt = `
You are a medical education expert. Based on the following medical content, generate ${questionCount} high-quality multiple-choice questions.

MEDICAL CONTEXT:
${content.substring(0, contentLimit)}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${questionCount} multiple-choice questions
2. Each question must have exactly 4 options
3. Mark exactly ONE correct answer per question (use index 0, 1, 2, or 3)
4. Provide a detailed medical explanation for each answer
5. Questions should test understanding, not just recall

IMPORTANT: You MUST return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Full question text here?",
    "options": ["Option 1 text", "Option 2 text", "Option 3 text", "Option 4 text"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation here..."
  }
]

DO NOT include any other text, explanations, or markdown. ONLY the JSON array.`;

    console.log(`🚀 Calling OpenAI API for ${questionCount} questions...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a medical professor. Generate exactly ${questionCount} MCQs from medical content. Return ONLY a JSON array with question objects having: question, options (array of 4), correctAnswer (0-3), explanation.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const result = response.choices[0]?.message?.content?.trim();
    
    console.log(`✅ OpenAI API Response received`);
    console.log(`📄 Response length: ${result?.length || 0} characters`);
    
    if (!result) {
      throw new Error("Empty response from AI service");
    }

    console.log(`📄 First 300 chars of response:`, result.substring(0, 300));
    
    let parsed: any;
    let rawResult = result;
    
    // Try to clean the response first
    try {
      // Remove any markdown code blocks
      rawResult = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Remove any text before the first [ or after the last ]
      const jsonStart = rawResult.indexOf('[');
      const jsonEnd = rawResult.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        rawResult = rawResult.substring(jsonStart, jsonEnd + 1);
      }
      
      parsed = JSON.parse(rawResult);
      console.log(`✅ Successfully parsed JSON response`);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      console.error('❌ Failed to parse JSON from AI response:', errorMessage);
      console.log('📄 Cleaned response (first 500 chars):', rawResult.substring(0, 500));
      throw new Error(`AI returned invalid JSON: ${errorMessage}`);
    }

    // Normalize the response format
    let questions: any[] = [];
    
    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      questions = parsed.data;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      questions = parsed.items;
    } else {
      // Try to find any array in the object
      const arrayKeys = Object.keys(parsed).filter(key => Array.isArray(parsed[key]));
      if (arrayKeys.length > 0) {
        questions = parsed[arrayKeys[0]];
      } else {
        throw new Error("No question array found in AI response");
      }
    }

    console.log(`📊 Found ${questions.length} potential questions`);
    
    // Debug first question structure
    if (questions.length > 0) {
      console.log('🔍 First question structure:', JSON.stringify(questions[0], null, 2).substring(0, 500));
    }

    // Validate and clean each question
    const validatedQuestions: any[] = [];
    
    for (let i = 0; i < questions.length && validatedQuestions.length < questionCount; i++) {
      const q = questions[i];
      
      try {
        // Skip if not an object
        if (!q || typeof q !== 'object') {
          console.warn(`⚠️ Question ${i + 1}: Not an object, type: ${typeof q}`);
          continue;
        }
        
        // Extract question text - try multiple property names
        let questionText = '';
        const textSources = ['question', 'text', 'content', 'prompt', 'query'];
        for (const source of textSources) {
          if (typeof q[source] === 'string' && q[source].trim().length > 0) {
            questionText = q[source].trim();
            break;
          }
        }
        
        if (!questionText) {
          console.warn(`⚠️ Question ${i + 1}: No question text found`);
          continue;
        }
        
        // Extract options - try multiple property names
        let options: any[] = [];
        const optionSources = ['options', 'choices', 'answers', 'alternatives'];
        for (const source of optionSources) {
          if (Array.isArray(q[source]) && q[source].length >= 4) {
            options = q[source];
            break;
          }
        }
        
        if (options.length < 4) {
          console.warn(`⚠️ Question ${i + 1}: Only ${options.length} options, need at least 4`);
          continue;
        }
        
        // Extract correct answer
        let correctAnswer: any = q.correctAnswer;
        if (correctAnswer === undefined) correctAnswer = q.correct;
        if (correctAnswer === undefined) correctAnswer = q.answer;
        if (correctAnswer === undefined) correctAnswer = q.correctIndex;
        
        // Convert to number if needed
        let correctIndex = 0;
        if (typeof correctAnswer === 'number') {
          correctIndex = correctAnswer;
        } else if (typeof correctAnswer === 'string') {
          const letter = correctAnswer.toUpperCase().charAt(0);
          const indexMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '0': 0, '1': 1, '2': 2, '3': 3 };
          if (letter in indexMap) {
            correctIndex = indexMap[letter];
          }
        }
        
        // Validate index
        if (correctIndex < 0 || correctIndex > 3) {
          console.warn(`⚠️ Question ${i + 1}: Invalid correct index ${correctIndex}, defaulting to 0`);
          correctIndex = 0;
        }
        
        // Extract explanation
        let explanation = '';
        const explanationSources = ['explanation', 'reason', 'rationale', 'details'];
        for (const source of explanationSources) {
          if (typeof q[source] === 'string' && q[source].trim().length > 0) {
            explanation = q[source].trim();
            break;
          }
        }
        
        if (!explanation) {
          explanation = "See medical content for detailed explanation.";
        }
        
        // Clean options
        const cleanedOptions = options.slice(0, 4).map((opt: any, idx: number) => {
          let optionText = String(opt).trim();
          // Remove leading A., B., etc. if present
          optionText = optionText.replace(/^[A-D][\.\)]\s*/i, '');
          return optionText || `Option ${String.fromCharCode(65 + idx)}`;
        });
        
        validatedQuestions.push({
          question: questionText,
          options: cleanedOptions,
          correctAnswer: correctIndex,
          explanation: explanation
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Error processing question ${i + 1}:`, errorMessage);
        continue;
      }
    }

    console.log(`✅ Successfully validated ${validatedQuestions.length} questions`);

    if (validatedQuestions.length === 0) {
      throw new Error("No valid questions could be extracted from AI response");
    }

    return validatedQuestions.slice(0, questionCount);

  } catch (error) {
    console.error('❌ Error in generateAIQuestions:', error);
    throw error;
  }
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      serviceInfo: {
        name: "Smart Question Generator",
        description: "Generate medical questions from text or documents",
        status: "active"
      },
      tokenCost: 5,
      limits: {
        maxQuestions: 50,
        maxDuration: 300,
        maxTextLength: 10000,
        minContentLength: 50
      },
      supportedFileTypes: ["PDF", "DOC", "DOCX", "TXT"]
    });
  } catch (error) {
    console.error("Error fetching service info:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Service information temporarily unavailable" 
      },
      { status: 500 }
    );
  }
}