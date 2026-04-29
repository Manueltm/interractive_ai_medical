//app\api\flashcard-questions\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { getTopicsByDepartment, getDepartmentById } from "@/lib/db/queries";
import { TokenService } from "@/lib/services/tokenService";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");
  const topic = searchParams.get("topic");
  const numStr = searchParams.get("num");
  const num = parseInt(numStr || "5");
  

  if (!departmentId || !topic) {
    return NextResponse.json({ error: "Missing departmentId or topic" }, { status: 400 });
  }
  if (isNaN(num) || num < 1 || num > 50) {
    return NextResponse.json({ error: "Invalid num (1-50)" }, { status: 400 });
  }

  try {
    // Get session for user authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add token check before generating questions
    const tokenCheck = await TokenService.deductTokens(
      session.user.id,
      'flashcard_question',
      num // number of questions
    );

    if (!tokenCheck.success) {
      console.log(`❌ Token deduction failed: ${tokenCheck.message}`);
      return NextResponse.json({ 
        error: tokenCheck.message || "Insufficient tokens for this operation" 
      }, { status: 402 });
    }

    console.log(`✅ Tokens deducted, proceeding with question generation...`);

    const topics = await getTopicsByDepartment(departmentId);
    if (!topics.some(t => t.topic === topic)) {
      return NextResponse.json({ error: "Topic not found in department" }, { status: 400 });
    }

    // Fetch dept name for better prompt
    const dept = await getDepartmentById(departmentId);
    const deptName = dept?.name || "Medical";

    const prompt = `Generate exactly ${num} flashcard questions and answers for the topic "${topic}" in the ${deptName} department. Each question should be concise and suitable for medical students. Answers should be clear and detailed. Respond with ONLY a valid JSON array of objects like: [{"question": "Q1?", "answer": "A1 details"}, ...]. No extra text or markdown.`;

    console.log("OpenAI Prompt:", prompt.substring(0, 200) + "...");

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: "user", content: prompt }],
    });

    let raw = response.choices[0].message?.content ?? "[]";
    console.log("OpenAI Raw Response (first 300 chars):", raw.substring(0, 300));

    // Safe JSON extraction
    let flashcards = [];
    if (raw.includes('[') && raw.includes(']')) {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        raw = jsonMatch[0];
      }
    }

    try {
      flashcards = JSON.parse(raw);
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr);
      return NextResponse.json([], { status: 200 });
    }

    if (!Array.isArray(flashcards) || flashcards.length !== num) {
      console.warn("Invalid array or length:", flashcards.length);
      flashcards = [];
    }

    console.log("✅ Flashcards generated successfully:", flashcards.length);
    return NextResponse.json(flashcards);
  } catch (error: any) {
    console.error("Full Error in Flashcard Route:", error);
    if (error.status === 401) {
      return NextResponse.json({ error: "OpenAI Auth Failed (check key)" }, { status: 500 });
    } else if (error.status === 429) {
      return NextResponse.json({ error: "OpenAI Rate Limit (try later)" }, { status: 500 });
    }
    return NextResponse.json([], { status: 200 });
  }
}