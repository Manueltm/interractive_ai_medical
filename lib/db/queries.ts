// lib/db/queries.ts

import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  sql,
  isNotNull,
  lte,
  ne,
  isNull,
  ilike,
} from "drizzle-orm";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  type Department,
  department,
  type PatientCase,
  type NewPatientCase,
  patientCase,
  type Patient,
  type NewPatient,
  patient,
  type FlashcardTopic,
  flashcardTopic,
  type FlashcardHistory,
  flashcardHistory,
  type SessionType,
  type NewSession,
  sessionTable,
  type NewChat,
  type NewMessage,
  type NewSuggestion,
  type Rubric,
  rubric,
  type RubricCriteria,
  rubricCriteria,
  type Evaluation,
  evaluation,
  type StepFeedback,
  type NewStepFeedback,
  stepFeedback,
  type CBTCategory,
  cbtCategory,
  type CBTQuestion,
  cbtQuestion,
  cbtSelection,
  cbtSession,
  type CBTSession,
  type NewCBTSession,
  cbtSessionRelations,
} from "./schema";
import { generateHashedPassword } from "./utils";

import { db } from "./index"; // reuse the single db instance

/* ================= USERS ================= */

// Define a type for the selected fields
type UserSelect = Pick<User, 'id' | 'email' | 'password' | 'googleSub' | 'role' | 'tokenBalance' | 'createdAt' | 'updatedAt'>;

export async function getUser(email: string): Promise<UserSelect[]> {
  try {
    return await db.select({
      id: user.id,
      email: user.email,
      password: user.password,
      googleSub: user.googleSub,
      role: user.role,
      tokenBalance: user.tokenBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }).from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("DB Query Error in getUser:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function getUserByGoogleSub(googleSub: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.googleSub, googleSub));
  } catch (error) {
    console.error("DB Query Error in getUserByGoogleSub:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by google sub"
    );
  }
}

export async function createUser(email: string, password?: string | null) {
  const hashedPassword = password ? generateHashedPassword(password) : null;
  try {
    const [newUser] = await db.insert(user).values({ 
      email, 
      password: hashedPassword,
      role: "user",
      tokenBalance: 0, // Add default token balance
    }).returning({
      id: user.id,
      email: user.email,
      password: user.password,
      googleSub: user.googleSub,
      role: user.role,
      tokenBalance: user.tokenBalance, // Add this line
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    return newUser;
  } catch (error) {
    console.error("DB Query Error in createUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const insertedUsers = await db
      .insert(user)
      .values({
        email,
        password,
        role: "user",
        tokenBalance: 0, // Add default token balance for guest
        createdAt: new Date(),
      })
      .returning({
        id: user.id,
        email: user.email,
        password: user.password,
        googleSub: user.googleSub,
        role: user.role,
        tokenBalance: user.tokenBalance, // Add this line
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

    return insertedUsers[0];
  } catch (err) {
    console.error("Failed to create guest user:", err);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

/* ================= DEPARTMENTS ================= */

export async function getDepartments(): Promise<Department[]> {
  try {
    return await db.select().from(department);
  } catch (error) {
    console.error("DB Query Error in getDepartments:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get departments");
  }
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  try {
    const [dept] = await db.select().from(department).where(eq(department.id, id));
    return dept || null;
  } catch (error) {
    console.error("DB Query Error in getDepartmentById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get department by id");
  }
}

export async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  try {
    const [dept] = await db.select().from(department).where(eq(department.slug, slug));
    return dept || null;
  } catch (error) {
    console.error("DB Query Error in getDepartmentBySlug:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get department by slug");
  }
}

export async function createDepartment(
  name: string, 
  slug: string, 
  color: string = "#0077b6", 
  fontColor: string = "#ffffff", 
  isFlashcardDept: boolean = false,
  osceType: 'clerking' | 'counselling' | 'physical_exam' | null = null
) {
  try {
    console.log('📝 DB Create Department:', { name, slug, isFlashcardDept, osceType }); // Debug log
    
    const [newDept] = await db
      .insert(department)
      .values({ 
        name, 
        slug, 
        color, 
        fontColor, 
        isFlashcardDept,
        osceType
      })
      .returning();
    
    console.log('✅ DB Department created:', newDept); // Debug log
    return newDept;
  } catch (error) {
    console.error("DB Query Error in createDepartment:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create department");
  }
}


export async function getChatsBySessionAndStation(
  sessionId: string, 
  stationIndex?: number, 
  userId?: string
) {
  try {
    // Build conditions array
    const conditions = [eq(chat.sessionId, sessionId)];
    
    if (userId) {
      conditions.push(eq(chat.userId, userId));
    }
    
    if (stationIndex !== undefined) {
      conditions.push(eq(chat.stationIndex, stationIndex));
    }
    
    // Use AND to combine conditions
    const result = await db
      .select()
      .from(chat)
      .where(and(...conditions))
      .orderBy(desc(chat.createdAt));
    
    return result;
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

export async function updateDepartment(id: string, data: Partial<Department>) {
  try {
    const [updated] = await db.update(department).set(data).where(eq(department.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateDepartment:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update department");
  }
}

/* ================= PATIENT CASES ================= */

export async function getPatientCases(): Promise<PatientCase[]> {
  try {
    return await db.select().from(patientCase);
  } catch (error) {
    console.error("DB Query Error in getPatientCases:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patient cases");
  }
}

export async function getPatientCasesByDepartment(departmentId: string): Promise<PatientCase[]> {
  try {
    return await db.select().from(patientCase).where(eq(patientCase.departmentId, departmentId));
  } catch (error) {
    console.error("DB Query Error in getPatientCasesByDepartment:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patient cases by department");
  }
}

export async function getPatientCaseById(id: string): Promise<PatientCase | null> {
  try {
    const [caseItem] = await db.select().from(patientCase).where(eq(patientCase.id, id));
    return caseItem || null;
  } catch (error) {
    console.error("DB Query Error in getPatientCaseById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patient case by id");
  }
}

export async function createPatientCase(newCase: NewPatientCase) {
  try {
    const [created] = await db.insert(patientCase).values(newCase).returning();
    return created;
  } catch (error) {
    console.error("DB Query Error in createPatientCase:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create patient case");
  }
}

export async function updatePatientCase(id: string, data: Partial<PatientCase>) {
  try {
    const [updated] = await db.update(patientCase).set(data).where(eq(patientCase.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updatePatientCase:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update patient case");
  }
}

/* ================= PATIENTS ================= */

export async function getPatientsByCase(caseId: string): Promise<Patient[]> {
  try {
    return await db.select().from(patient).where(eq(patient.caseId, caseId));
  } catch (error) {
    console.error("DB Query Error in getPatientsByCase:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patients by case");
  }
}

export async function getPatients(): Promise<Patient[]> {
  try {
    return await db.select().from(patient);
  } catch (error) {
    console.error("DB Query Error in getPatients:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patients");
  }
}

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const [pat] = await db.select().from(patient).where(eq(patient.id, id));
    return pat || null;
  } catch (error) {
    console.error("DB Query Error in getPatientById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get patient by id");
  }
}

export async function createPatient(newPatient: NewPatient) {
  try {
    const [created] = await db.insert(patient).values(newPatient).returning();
    return created;
  } catch (error) {
    console.error("DB Query Error in createPatient:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create patient");
  }
}

export async function updatePatient(id: string, data: Partial<Patient>) {
  try {
    const [updated] = await db.update(patient).set(data).where(eq(patient.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updatePatient:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update patient");
  }
}

/* ================= FLASHCARD TOPICS ================= */

export async function getTopicsByDepartment(departmentId: string): Promise<FlashcardTopic[]> {
  try {
    return await db
      .select()
      .from(flashcardTopic)
      .where(eq(flashcardTopic.departmentId, departmentId))
      .orderBy(asc(flashcardTopic.topic));
  } catch (error) {
    console.error("DB Query Error in getTopicsByDepartment:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get topics by department");
  }
}

export async function createFlashcardTopic(departmentId: string, topic: string) {
  try {
    const [newTopic] = await db
      .insert(flashcardTopic)
      .values({ departmentId, topic })
      .returning();
    return newTopic;
  } catch (error) {
    console.error("DB Query Error in createFlashcardTopic:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create flashcard topic");
  }
}

export async function updateFlashcardTopic(id: string, data: Partial<FlashcardTopic>) {
  try {
    const [updated] = await db.update(flashcardTopic).set(data).where(eq(flashcardTopic.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateFlashcardTopic:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update flashcard topic");
  }
}

/* ================= FLASHCARD HISTORY ================= */

export async function saveFlashcardHistory(sessionId: string, departmentId: string, topic: string, question: string, answer: string) {
  try {
    const [history] = await db
      .insert(flashcardHistory)
      .values({ sessionId, departmentId, topic, question, answer })
      .returning();
    return history;
  } catch (error) {
    console.error("DB Query Error in saveFlashcardHistory:", error);
    throw new ChatSDKError("bad_request:database", "Failed to save flashcard history");
  }
}

export async function getFlashcardHistoryBySession(sessionId: string): Promise<FlashcardHistory[]> {
  try {
    return await db.select().from(flashcardHistory).where(eq(flashcardHistory.sessionId, sessionId));
  } catch (error) {
    console.error("DB Query Error in getFlashcardHistoryBySession:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get flashcard history by session");
  }
}

/* ================= SESSIONS ================= */

export async function createSession(newSession: NewSession) {
  try {
    return await db.insert(sessionTable).values(newSession).returning();
  } catch (error) {
    console.error("DB Query Error in createSession:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create session");
  }
}

export async function updateSessionStatus(sessionId: string, status: "active" | "completed" | "saved") {
  try {
    return await db.update(sessionTable).set({ status }).where(eq(sessionTable.id, sessionId));
  } catch (error) {
    console.error("DB Query Error in updateSessionStatus:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update session status");
  }
}

export async function getSessionsByUser(userId: string): Promise<SessionType[]> {
  try {
    return await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, userId))
      .orderBy(desc(sessionTable.createdAt));
  } catch (error) {
    console.error("DB Query Error in getSessionsByUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get sessions by user");
  }
}

export async function getSavedSessionsByUser(userId: string): Promise<SessionType[]> {
  try {
    return await db
      .select()
      .from(sessionTable)
      .where(and(eq(sessionTable.userId, userId), eq(sessionTable.status, "saved")))
      .orderBy(desc(sessionTable.createdAt));
  } catch (error) {
    console.error("DB Query Error in getSavedSessionsByUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get saved sessions by user");
  }
}

export async function getSessionById(sessionId: string): Promise<SessionType | null> {
  try {
    const [sess] = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId));
    return sess || null;
  } catch (error) {
    console.error("DB Query Error in getSessionById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get session by id");
  }
}

/* ================= CHATS ================= */

export async function saveChat(chatData: NewChat) {
  try {
    const [created] = await db.insert(chat).values(chatData).returning();
    return created;
  } catch (error) {
    console.error("DB Query Error in saveChat:", error);
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById(id: string) {
  try {
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));
    await db.delete(suggestion).where(eq(suggestion.chatId, id));
    await db.delete(evaluation).where(eq(evaluation.chatId, id));
    await db.delete(stepFeedback).where(eq(stepFeedback.chatId, id));

    const chatsDeleted = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning() as Chat[];
    return chatsDeleted[0];
  } catch (error) {
    console.error("DB Query Error in deleteChatById:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatById(id: string): Promise<Chat | null> {
  try {
    const [chatData] = await db.select().from(chat).where(eq(chat.id, id));
    return chatData || null;
  } catch (error) {
    console.error("DB Query Error in getChatById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function getChatsByUser(userId: string): Promise<Chat[]> {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, userId))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("DB Query Error in getChatsByUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get chats by user");
  }
}

export async function getChatsBySession(sessionId: string): Promise<Chat[]> {
  try {
    return await db.select().from(chat).where(eq(chat.sessionId, sessionId));
  } catch (error) {
    console.error("DB Query Error in getChatsBySession:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get chats by session");
  }
}

export async function getIncompleteChatByUser(userId: string): Promise<Chat | null> {
  try {
    const [incomplete] = await db
      .select()
      .from(chat)
      .where(and(eq(chat.userId, userId), eq(chat.status, "incomplete")))
      .orderBy(desc(chat.createdAt))
      .limit(1);
    return incomplete || null;
  } catch (error) {
    console.error("DB Query Error in getIncompleteChatByUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get incomplete chat by user");
  }
}

export async function updateChatStatus(id: string, status: "incomplete" | "completed") {
  try {
    const [updated] = await db.update(chat).set({ status }).where(eq(chat.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateChatStatus:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update chat status");
  }
}

/* ================= MESSAGES ================= */

export async function saveMessage(messageData: NewMessage) {
  try {
    console.log('Saving message with data:', messageData);
    
    // Make sure all required fields are present
    if (!messageData.id) messageData.id = crypto.randomUUID();
    if (!messageData.createdAt) messageData.createdAt = new Date();
    
    const result = await db.insert(message).values(messageData).returning();
    console.log('Message saved successfully:', result[0]);
    return result[0];
  } catch (error) {
    console.error("DB Query Error in saveMessage:", error);
    throw new Error(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getMessagesByChat(chatId: string) {
  try {
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(message.createdAt);
    return messages;
  } catch (error) {
    console.error("DB Query Error in getMessagesByChat:", error);
    throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/* ================= SUGGESTIONS ================= */

export async function saveSuggestion(suggestionData: NewSuggestion) {
  try {
    return await db.insert(suggestion).values(suggestionData);
  } catch (error) {
    console.error("DB Query Error in saveSuggestion:", error);
    throw new ChatSDKError("bad_request:database", "Failed to save suggestion");
  }
}

export async function getSuggestionsByChat(chatId: string): Promise<Suggestion[]> {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.chatId, chatId))
      .orderBy(asc(suggestion.createdAt));
  } catch (error) {
    console.error("DB Query Error in getSuggestionsByChat:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by chat"
    );
  }
}

/* ================= RUBRICS ================= */

export async function getRubricsByDepartment(
  departmentId: string
): Promise<Rubric[]> {
  try {
    return await db
      .select()
      .from(rubric)
      .where(eq(rubric.departmentId, departmentId));
  } catch (error) {
    console.error("DB Query Error in getRubricsByDepartment:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get rubrics by department"
    );
  }
}

export async function getRubricById(id: string): Promise<Rubric | null> {
  try {
    const [rubricData] = await db.select().from(rubric).where(eq(rubric.id, id));
    return rubricData || null;
  } catch (error) {
    console.error("DB Query Error in getRubricById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get rubric by id");
  }
}

/* ================= RUBRIC CRITERIA ================= */

export async function getRubricCriteriaByRubric(
  rubricId: string
): Promise<RubricCriteria[]> {
  try {
    return await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricId, rubricId));
  } catch (error) {
    console.error("DB Query Error in getRubricCriteriaByRubric:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get rubric criteria by rubric"
    );
  }
}

/* ================= EVALUATIONS ================= */

export async function saveEvaluation(evaluationData: Omit<Evaluation, "id">) {
  try {
    return await db.insert(evaluation).values(evaluationData);
  } catch (error) {
    console.error("DB Query Error in saveEvaluation:", error);
    throw new ChatSDKError("bad_request:database", "Failed to save evaluation");
  }
}

export async function getEvaluationsByChat(
  chatId: string
): Promise<Evaluation[]> {
  try {
    return await db
      .select()
      .from(evaluation)
      .where(eq(evaluation.chatId, chatId));
  } catch (error) {
    console.error("DB Query Error in getEvaluationsByChat:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get evaluations by chat"
    );
  }
}

/* ================= STEP FEEDBACK ================= */

export async function saveStepFeedback(chatId: string, stepIndex: number, feedback: any) {
  try {
    await db.insert(stepFeedback).values({
      chatId,
      stepIndex,
      feedback,
    });
  } catch (error) {
    console.error("DB Query Error in saveStepFeedback:", error);
    throw new ChatSDKError("bad_request:database", "Failed to save step feedback");
  }
}

export async function getStepFeedbacksByChat(chatId: string): Promise<StepFeedback[]> {
  try {
    return await db
      .select()
      .from(stepFeedback)
      .where(eq(stepFeedback.chatId, chatId))
      .orderBy(asc(stepFeedback.stepIndex));
  } catch (error) {
    console.error("DB Query Error in getStepFeedbacksByChat:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get step feedbacks by chat");
  }
}

/* ================= USAGE ================= */

export async function getUsageByUser(
  userId: string,
  startDate: Date
): Promise<AppUsage> {
  try {
    const messageCountResult = await db
      .select({ count: count() })
      .from(message)
      .where(
        sql`message.chatId IN (SELECT id FROM ${chat} WHERE ${chat.userId} = ${userId} AND ${chat.createdAt} >= ${startDate})`
      );
    const chatCount = await db
      .select({ count: count() })
      .from(chat)
      .where(and(eq(chat.userId, userId), gte(chat.createdAt, startDate)));
    const suggestionCount = await db
      .select({ count: count() })
      .from(suggestion)
      .where(
        and(eq(suggestion.userId, userId), gte(suggestion.createdAt, startDate))
      );

    return {
      messageCount: messageCountResult[0].count,
      chatCount: chatCount[0].count,
      suggestionCount: suggestionCount[0].count,
    };
  } catch (error) {
    console.error("DB Query Error in getUsageByUser:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get usage by user");
  }
}

export const getSessionByChatId = async (chatId: string): Promise<SessionType | null> => {
  try {
    const [session] = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.chatId, chatId));
    return session ?? null;
  } catch (error) {
    console.error("DB Query Error in getSessionByChatId:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get session by chat id");
  }
};
/* ================= CBT STATS ================= */

/* ================= CBT STATS ================= */
// In lib/db/queries.ts - Update getCbtStats function
export async function getCbtStats(
  userId: string,
  cbtType: "mdcn" | "mbbs" | "all" = "all",
  startDate?: Date,
  endDate?: Date
) {
  try {
    const conditions: any[] = [eq(cbtSession.userId, userId)];
    
    if (cbtType !== "all") conditions.push(eq(cbtSession.cbtType, cbtType));
    if (startDate) conditions.push(gte(cbtSession.createdAt, startDate));
    if (endDate) conditions.push(lte(cbtSession.createdAt, endDate));

    const sessions = await db
      .select({
        score: cbtSession.score,
        correctAnswers: cbtSession.correctAnswers,
        wrongAnswers: cbtSession.wrongAnswers,
        unanswered: cbtSession.unanswered,
        numQuestions: cbtSession.numQuestions,
        mode: cbtSession.mode,
        createdAt: cbtSession.createdAt,
      })
      .from(cbtSession)
      .where(and(...conditions));

    // Calculate comprehensive stats
    const totalAttempts = sessions.length;
    
    // FIXED: Total Questions Attempted = correct + wrong (not including unanswered)
    const totalQuestionsAttempted = sessions.reduce((sum, s) => sum + (s.correctAnswers || 0) + (s.wrongAnswers || 0), 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0);
    const totalWrong = sessions.reduce((sum, s) => sum + (s.wrongAnswers || 0), 0);
    const totalUnanswered = sessions.reduce((sum, s) => sum + (s.unanswered || 0), 0);
    
    // Average score across all sessions
    const validSessions = sessions.filter(s => s.score !== null);
    const avgScore = validSessions.length > 0 
      ? validSessions.reduce((sum, s) => sum + (s.score || 0), 0) / validSessions.length 
      : 0;

    // Mode-specific stats
    const practiceSessions = sessions.filter(s => s.mode === 'practice');
    const timedSessions = sessions.filter(s => s.mode === 'timed');
    const examSessions = sessions.filter(s => s.mode === 'exam');

    // Score progression (last 10 sessions)
    const recentScores = sessions
      .filter(s => s.score !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10)
      .map(s => s.score || 0);

    // Accuracy based on attempted questions only
    const accuracy = totalQuestionsAttempted > 0 ? (totalCorrect / totalQuestionsAttempted) * 100 : 0;

    return {
      totalAttempts,
      totalQuestions: totalQuestionsAttempted, // This now represents attempted questions
      correct: totalCorrect,
      wrong: totalWrong,
      unanswered: totalUnanswered,
      avgScore,
      completedSessions: totalAttempts,
      scoresData: recentScores,
      modeBreakdown: {
        practice: practiceSessions.length,
        timed: timedSessions.length,
        exam: examSessions.length
      },
      accuracy,
      completionRate: totalQuestionsAttempted > 0 ? ((totalCorrect + totalWrong) / totalQuestionsAttempted) * 100 : 0
    };
  } catch (error) {
    console.error("DB Query Error in getCbtStats:", error);
    return {
      totalAttempts: 0,
      totalQuestions: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
      avgScore: 0,
      completedSessions: 0,
      scoresData: [],
      modeBreakdown: { practice: 0, timed: 0, exam: 0 },
      accuracy: 0,
      completionRate: 0
    };
  }
}
/* ================= CBT HISTORY ================= */
// lib/db/queries.ts
/* ================= CBT HISTORY ================= */
export async function getCbtHistory(
  userId: string,
  filters: {
    type?: "mdcn" | "mbbs";
    status?: "correct" | "incorrect" | "unanswered";
    search?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    // Build conditions array
    const conditions: any[] = [eq(cbtSelection.userId, userId), eq(cbtSelection.firstAttempt, true)];

    if (filters.type) {
      conditions.push(eq(cbtCategory.cbtType, filters.type));
    }

    if (filters.startDate) {
      conditions.push(gte(cbtSelection.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(cbtSelection.createdAt, filters.endDate));
    }

    // Get all history first
    const history = await db
      .select({
        id: cbtSelection.id,
        questionId: cbtSelection.questionId,
        selectedOption: cbtSelection.selectedOption,
        createdAt: cbtSelection.createdAt,
        questionContent: cbtQuestion.content,
        explanation: cbtQuestion.explanation,
        options: cbtQuestion.options,
        cbtType: cbtCategory.cbtType,
        categoryName: cbtCategory.name,
      })
      .from(cbtSelection)
      .innerJoin(cbtQuestion, eq(cbtSelection.questionId, cbtQuestion.id))
      .innerJoin(cbtCategory, eq(cbtQuestion.categoryId, cbtCategory.id))
      .where(and(...conditions))
      .orderBy(desc(cbtSelection.createdAt));

    // Process and filter the results
    const processedHistory = history.map(item => {
      const options = item.options as { text: string; correct: boolean }[];
      const correctOption = options.findIndex(opt => opt.correct);
      const isCorrect = item.selectedOption === correctOption;

      return {
        ...item,
        correctOption,
        isCorrect,
      };
    });

    // Apply status filter if specified
    let filteredHistory = processedHistory;
    if (filters.status) {
      filteredHistory = processedHistory.filter(item => {
        if (filters.status === 'correct') return item.isCorrect;
        if (filters.status === 'incorrect') return !item.isCorrect && item.selectedOption !== null;
        if (filters.status === 'unanswered') return item.selectedOption === null;
        return true;
      });
    }

    // Apply search filter if specified
    if (filters.search) {
      filteredHistory = filteredHistory.filter(item =>
        item.questionContent.toLowerCase().includes(filters.search!.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    return filteredHistory;
  } catch (error) {
    console.error("DB Query Error in getCbtHistory:", error);
    return [];
  }
}


export async function deleteSessionById(sessionId: string) {
  try {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  } catch (e) {
    console.warn("Session already gone or delete failed", e);
  }
}

export async function updateChat(id: string, data: Partial<Chat>) {
  try {
    const [updated] = await db.update(chat).set(data).where(eq(chat.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateChat:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update chat");
  }
}
// UPDATED: Leaderboard query with proper typing
export async function getLeaderboard(filter: 'scenarios' | 'flashcards', scoreType: 'valid' | 'absolute' = 'valid') {
  if (filter === 'scenarios') {
    if (scoreType === 'valid') {
      // Valid scores only (excluding zeros) - matches VoiceChat Statistics
      const result = await db
        .select({
          userId: user.id,
          username: sql`SUBSTRING(${user.email} FROM 1 FOR 15) || '...'`,
          avgScore: sql`AVG(CASE WHEN ${chat.latestScore} > 0 THEN ${chat.latestScore} ELSE NULL END)`,
          totalChats: sql`COUNT(${chat.id})`,
          validScores: sql`COUNT(CASE WHEN ${chat.latestScore} > 0 THEN ${chat.latestScore} END)`,
        })
        .from(user)
        .leftJoin(chat, eq(chat.userId, user.id))
        .where(isNotNull(chat.latestScore))
        .groupBy(user.id)
        .having(sql`COUNT(CASE WHEN ${chat.latestScore} > 0 THEN ${chat.latestScore} END) > 0`)
        .orderBy(desc(sql`AVG(CASE WHEN ${chat.latestScore} > 0 THEN ${chat.latestScore} ELSE NULL END)`))
        .limit(20);
      
      return result.map(row => ({
        username: row.username,
        avgScore: Number(row.avgScore) || 0,
        validScores: Number(row.validScores) || 0,
        totalChats: Number(row.totalChats) || 0,
      }));
    } else {
      // All scores (including zeros and NULLs) - absolute average
const result = await db
  .select({
    userId: user.id,
    username: sql`SUBSTRING(${user.email} FROM 1 FOR 8) || '...'`,
    avgScore: sql`AVG(COALESCE(${chat.latestScore}, 0))`,
    totalChats: sql`COUNT(${chat.id})`,
    validScores: sql`COUNT(CASE WHEN ${chat.latestScore} > 0 THEN 1 END)`,
  })
  .from(user)
  .leftJoin(chat, eq(chat.userId, user.id))
  // ✅ No .where(isNotNull(chat.latestScore)) — include all
  .groupBy(user.id)
  .having(sql`COUNT(${chat.id}) > 0`)
  .orderBy(desc(sql`AVG(COALESCE(${chat.latestScore}, 0))`))
  .limit(20);
      
      return result.map(row => ({
        username: row.username,
        avgScore: Number(row.avgScore) || 0,
        validScores: Number(row.validScores) || 0,
        totalChats: Number(row.totalChats) || 0,
      }));
    }
  } else { // flashcards
    const result = await db
      .select({
        userId: user.id,
        username: sql`SUBSTRING(${user.email} FROM 1 FOR 8) || '...'`,
        avgScore: sql`AVG(${sessionTable.numQuestions})`,
        totalChats: sql`COUNT(${sessionTable.id})`,
      })
      .from(user)
      .leftJoin(sessionTable, eq(sessionTable.userId, user.id))
      .where(eq(sessionTable.type, 'flashcards'))
      .groupBy(user.id)
      .orderBy(desc(sql`AVG(${sessionTable.numQuestions})`))
      .limit(20);
    
    return result.map(row => ({
      username: row.username,
      avgScore: Number(row.avgScore) || 0,
      totalChats: Number(row.totalChats) || 0,
    }));
  }
}

/* ================= CBT CATEGORIES ================= */

export async function getCbtCategories(cbtType: 'mdcn' | 'mbbs'): Promise<CBTCategory[]> {
  try {
    return await db.select().from(cbtCategory).where(eq(cbtCategory.cbtType, cbtType));
  } catch (error) {
    console.error("DB Query Error in getCbtCategories:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT categories");
  }
}

export async function getCbtCategoryById(id: string): Promise<CBTCategory | null> {
  try {
    const [cat] = await db.select().from(cbtCategory).where(eq(cbtCategory.id, id));
    return cat || null;
  } catch (error) {
    console.error("DB Query Error in getCbtCategoryById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT category by id");
  }
}

export async function getCbtCategoryByName(name: string): Promise<CBTCategory | null> {
  try {
    const [cat] = await db.select().from(cbtCategory).where(eq(cbtCategory.name, name));
    return cat || null;
  } catch (error) {
    console.error("DB Query Error in getCbtCategoryByName:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT category by name");
  }
}

export async function createCbtCategory(name: string, slug: string, cbtType: 'mdcn' | 'mbbs') {
  try {
    const [newCat] = await db.insert(cbtCategory).values({ name, slug, cbtType }).returning();
    return newCat;
  } catch (error) {
    console.error("DB Query Error in createCbtCategory:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create CBT category");
  }
}

export async function updateCbtCategory(id: string, data: Partial<CBTCategory>) {
  try {
    const [updated] = await db.update(cbtCategory).set(data).where(eq(cbtCategory.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateCbtCategory:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update CBT category");
  }
}

/* ================= CBT QUESTIONS ================= */


export async function getCbtQuestions(categoryId?: string, limit?: number): Promise<CBTQuestion[]> {
  try {
    const q = db.select().from(cbtQuestion);
    if (categoryId) q.where(eq(cbtQuestion.categoryId, categoryId));
    if (limit) q.limit(limit);
    return q;
  } catch (error) {
    console.error("DB Query Error in getCbtQuestions:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT questions");
  }
}

export async function getRandomCbtQuestions(num: number, cbtType: 'mdcn' | 'mbbs'): Promise<CBTQuestion[]> {
  try {
    // Get all questions first, then shuffle in JavaScript
    const allQuestions = await db
      .select({
        id: cbtQuestion.id,
        categoryId: cbtQuestion.categoryId,
        content: cbtQuestion.content,
        explanation: cbtQuestion.explanation,
        figureUrl: cbtQuestion.figureUrl,
        options: cbtQuestion.options,
        createdAt: cbtQuestion.createdAt,
        updatedAt: cbtQuestion.updatedAt,
      })
      .from(cbtQuestion)
      .innerJoin(cbtCategory, eq(cbtQuestion.categoryId, cbtCategory.id))
      .where(eq(cbtCategory.cbtType, cbtType));
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, num);
  } catch (error) {
    console.error("DB Query Error in getRandomCbtQuestions:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get random CBT questions");
  }
}

export async function getCbtQuestionById(id: string): Promise<CBTQuestion | null> {
  try {
    const [q] = await db.select().from(cbtQuestion).where(eq(cbtQuestion.id, id));
    return q || null;
  } catch (error) {
    console.error("DB Query Error in getCbtQuestionById:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT question by id");
  }
}

export async function createCbtQuestion(data: Omit<CBTQuestion, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const [created] = await db.insert(cbtQuestion).values(data).returning();
    return created;
  } catch (error) {
    console.error("DB Query Error in createCbtQuestion:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create CBT question");
  }
}

export async function updateCbtQuestion(id: string, data: Partial<CBTQuestion>) {
  try {
    const [updated] = await db.update(cbtQuestion).set(data).where(eq(cbtQuestion.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateCbtQuestion:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update CBT question");
  }
}

export async function getCbtQuestionsByType(cbtType: 'mdcn' | 'mbbs', limit?: number): Promise<CBTQuestion[]> {
  try {
    const q = db
      .select({
        id: cbtQuestion.id,
        categoryId: cbtQuestion.categoryId,
        content: cbtQuestion.content,
        explanation: cbtQuestion.explanation,
        figureUrl: cbtQuestion.figureUrl,
        options: cbtQuestion.options,
        createdAt: cbtQuestion.createdAt,
        updatedAt: cbtQuestion.updatedAt,
      })
      .from(cbtQuestion)
      .innerJoin(cbtCategory, eq(cbtQuestion.categoryId, cbtCategory.id))
      .where(eq(cbtCategory.cbtType, cbtType));
    if (limit) q.limit(limit);
    return q;
  } catch (error) {
    console.error("DB Query Error in getCbtQuestionsByType:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get CBT questions by type");
  }
}



export const deleteDepartment           = (id: string) => db.delete(department).where(eq(department.id, id));
export const deletePatientCase          = (id: string) => db.delete(patientCase).where(eq(patientCase.id, id));
export const deletePatient              = (id: string) => db.delete(patient).where(eq(patient.id, id));
export const deleteFlashcardTopic       = (id: string) => db.delete(flashcardTopic).where(eq(flashcardTopic.id, id));

// In lib/db/queries.ts - Update createCbtSession function
export async function createCbtSession(sessionData: Omit<NewCBTSession, 'id' | 'createdAt' | 'completedAt'>) {
  try {
    console.log('🗄️ Creating CBT session in database:', sessionData);
    
    // Ensure we're not passing any Date objects that might cause issues
    const cleanData = {
      ...sessionData,
      // Let database handle timestamps
    };
    
    const [created] = await db.insert(cbtSession).values(cleanData).returning();
    console.log('✅ CBT session created successfully:', created.id);
    return created;
  } catch (error) {
    console.error("❌ DB Query Error in createCbtSession:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create CBT session");
  }
}

export async function updateCbtSession(id: string, data: Partial<CBTSession>) {
  try {
    // If score is being set and completedAt is not provided, set it automatically
    const updateData = { ...data };
    if (updateData.score !== undefined && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }
    
    const [updated] = await db.update(cbtSession).set(updateData).where(eq(cbtSession.id, id)).returning();
    return updated;
  } catch (error) {
    console.error("DB Query Error in updateCbtSession:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update CBT session");
  }
}

export async function getCbtSessions(
  userId: string,
  filters: {
    type?: "mdcn" | "mbbs";
    mode?: "practice" | "timed" | "exam";
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    const conditions: any[] = [eq(cbtSession.userId, userId)];

    if (filters.type) {
      conditions.push(eq(cbtSession.cbtType, filters.type));
    }
    if (filters.mode) {
      conditions.push(eq(cbtSession.mode, filters.mode));
    }
    if (filters.startDate) {
      conditions.push(gte(cbtSession.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(cbtSession.createdAt, filters.endDate));
    }

    const sessions = await db
      .select({
        id: cbtSession.id,
        cbtType: cbtSession.cbtType,
        mode: cbtSession.mode,
        categoryId: cbtSession.categoryId,
        categoryName: cbtCategory.name,
        numQuestions: cbtSession.numQuestions,
        duration: cbtSession.duration,
        score: cbtSession.score,
        correctAnswers: cbtSession.correctAnswers,
        wrongAnswers: cbtSession.wrongAnswers,
        unanswered: cbtSession.unanswered,
        completedAt: cbtSession.completedAt,
        createdAt: cbtSession.createdAt,
      })
      .from(cbtSession)
      .leftJoin(cbtCategory, eq(cbtSession.categoryId, cbtCategory.id))
      .where(and(...conditions))
      .orderBy(desc(cbtSession.createdAt));

    return sessions;
  } catch (error) {
    console.error("DB Query Error in getCbtSessions:", error);
    return [];
  }
}

// In lib/db/queries.ts - COMPLETELY REPLACE getCbtSessionWithDetails
export async function getCbtSessionWithDetails(sessionId: string, userId: string) {
  try {
    console.log('🔍 Fetching CBT session details for:', { sessionId, userId });
    
    // Get session info with category name
    const sessionResult = await db
      .select({
        id: cbtSession.id,
        cbtType: cbtSession.cbtType,
        mode: cbtSession.mode,
        categoryId: cbtSession.categoryId,
        categoryName: cbtCategory.name,
        numQuestions: cbtSession.numQuestions,
        duration: cbtSession.duration,
        score: cbtSession.score,
        correctAnswers: cbtSession.correctAnswers,
        wrongAnswers: cbtSession.wrongAnswers,
        unanswered: cbtSession.unanswered,
        completedAt: cbtSession.completedAt,
        createdAt: cbtSession.createdAt,
      })
      .from(cbtSession)
      .leftJoin(cbtCategory, eq(cbtSession.categoryId, cbtCategory.id))
      .where(and(eq(cbtSession.id, sessionId), eq(cbtSession.userId, userId)));

    if (sessionResult.length === 0) {
      console.log('❌ Session not found');
      return null;
    }

    const session = sessionResult[0];
    console.log('✅ Found session:', session.id, 'with', session.numQuestions, 'questions');

    // Get ALL selections for this session (not just first attempts)
    const selections = await db
      .select({
        id: cbtSelection.id,
        questionId: cbtQuestion.id,
        questionContent: cbtQuestion.content,
        selectedOption: cbtSelection.selectedOption,
        options: cbtQuestion.options,
        explanation: cbtQuestion.explanation,
        figureUrl: cbtQuestion.figureUrl,
        createdAt: cbtSelection.createdAt,
        categoryName: cbtCategory.name,
        cbtType: cbtCategory.cbtType,
      })
      .from(cbtSelection)
      .innerJoin(cbtQuestion, eq(cbtSelection.questionId, cbtQuestion.id))
      .innerJoin(cbtCategory, eq(cbtQuestion.categoryId, cbtCategory.id))
      .where(and(
        eq(cbtSelection.sessionId, sessionId),
        eq(cbtSelection.userId, userId)
      ))
      .orderBy(asc(cbtSelection.createdAt));

    console.log('📊 Found selections:', selections.length);

    // Process each selection to include correctness
    const questionsWithStatus = selections.map((selection, index) => {
      const options = selection.options as { text: string; correct: boolean }[];
      const correctOption = options.findIndex(opt => opt.correct);
      const isCorrect = selection.selectedOption !== null && selection.selectedOption === correctOption;
      
      return {
        id: selection.id,
        questionId: selection.questionId,
        questionContent: selection.questionContent,
        selectedOption: selection.selectedOption,
        correctOption: correctOption,
        options: options,
        explanation: selection.explanation,
        cbtType: selection.cbtType,
        categoryName: selection.categoryName,
        createdAt: selection.createdAt,
        isCorrect: isCorrect,
        figureUrl: selection.figureUrl || undefined
      };
    });

    console.log('✅ Processed questions:', questionsWithStatus.length);
    
    return {
      session,
      questions: questionsWithStatus
    };
  } catch (error) {
    console.error("❌ DB Query Error in getCbtSessionWithDetails:", error);
    return null;
  }
}