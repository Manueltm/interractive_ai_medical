// C:\Users\User\hume-voice-simulator\lib\db\schema.ts

import {
  boolean,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  decimal,
  doublePrecision,
  uuid,
  varchar,
  integer,
  index, 
  uniqueIndex, 
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";

export const sessionTypeEnum = pgEnum("session_type", [
  "clerking",
  "counselling",
  "physical_exam",
  "flashcards",
]);

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const roleEnum = pgEnum("role", ["student", "patient", "ai", "system"]);

export const visibilityEnum = pgEnum("visibility", ["public", "private"]);

export const statusEnum = pgEnum("status", ["active", "completed", "saved"]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const chatStatusEnum = pgEnum("chat_status", ["incomplete", "completed"]);

export const cbtTypeEnum = pgEnum("cbt_type", ["mdcn", "mbbs"]);

export const user = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }),
  password: varchar("password", { length: 64 }),
  googleSub: varchar("google_sub", { length: 255 }),
  name: varchar("name", { length: 255 }), 
  bio: text("bio"), 
  profileImage: text("profile_image"), 
  role: userRoleEnum("role").notNull().default("user"),
  tokenBalance: doublePrecision("token_balance").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

// In db/schema.ts
export const osceTypeEnum = pgEnum('osce_type', ['clerking', 'counselling', 'physical_exam']);

export const department = pgTable("department", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  color: varchar("color", { length: 7 }).default("#0077b6"),
  fontColor: varchar("font_color", { length: 7 }).default("#ffffff"),
  isFlashcardDept: boolean("is_flashcard_dept").notNull().default(false),
  osceType: osceTypeEnum("osce_type"), // ADD THIS LINE
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Department = InferSelectModel<typeof department>;
export type NewDepartment = InferInsertModel<typeof department>;

export const patientCase = pgTable("patient_case", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  departmentId: uuid("departmentId")
    .notNull()
    .references(() => department.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  sessionType: sessionTypeEnum("session_type").notNull(),
  topic: varchar("topic", { length: 128 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PatientCase = InferSelectModel<typeof patientCase>;
export type NewPatientCase = InferInsertModel<typeof patientCase>;

export const patient = pgTable("patient", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  caseId: uuid("caseId")
    .notNull()
    .references(() => patientCase.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull(),
  age: varchar("age", { length: 8 }).notNull(),
  gender: varchar("gender", { length: 16 }).default("male"),
  location: varchar("location", { length: 128 }),
  condition: text("condition").notNull(),
  prompt: text("prompt"),
  question: text("question"),
  answer: text("answer"),
  imageUrl: text("image_url"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Patient = InferSelectModel<typeof patient>;
export type NewPatient = InferInsertModel<typeof patient>;

export const flashcardTopic = pgTable("flashcard_topic", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  departmentId: uuid("departmentId")
    .notNull()
    .references(() => department.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FlashcardTopic = InferSelectModel<typeof flashcardTopic>;
export type NewFlashcardTopic = InferInsertModel<typeof flashcardTopic>;

export const flashcardHistory = pgTable("flashcard_history", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sessionId: uuid("sessionId")
    .notNull()
    .references(() => sessionTable.id, { onDelete: "cascade" }),
  departmentId: uuid("departmentId")
    .notNull()
    .references(() => department.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 128 }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type FlashcardHistory = InferSelectModel<typeof flashcardHistory>;
export type NewFlashcardHistory = InferInsertModel<typeof flashcardHistory>;

export const sessionTable = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull(),
  departmentId: uuid("departmentId")
    .notNull()
    .references(() => department.id, { onDelete: "cascade" }),
  caseId: uuid("caseId").references(() => patientCase.id, { onDelete: "cascade" }),
  patientId: uuid("patientId").references(() => patient.id, { onDelete: "cascade" }),
  numStations: integer("num_stations").default(1),
  duration: integer("duration").notNull(),
  topic: varchar("topic", { length: 128 }),
  numQuestions: integer("num_questions"),
  status: statusEnum("status").notNull().default("active"),
  chatId: uuid("chatId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
  completedAt: timestamp("completedAt"),
  stations: jsonb("stations").$type<{ index: number; patientId: string }[]>(),
});

export type SessionType = InferSelectModel<typeof sessionTable>;
export type NewSession = InferInsertModel<typeof sessionTable>;

export const chat = pgTable("chat", {
  id: varchar("id", { length: 50 }).primaryKey().notNull(),
  sessionId: uuid("sessionId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  patientId: uuid("patientId").references(() => patient.id, { onDelete: "cascade" }),
  departmentId: uuid("departmentId").references(() => department.id, { onDelete: "set null" }), // ADD THIS
  visibility: visibilityEnum("visibility")
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext"),
  latestScore: integer("latestScore"),
  latestGrade: varchar("latestGrade", { length: 4 }),
  latestFeedback: text("latestFeedback"),
  status: chatStatusEnum("status").notNull().default("incomplete"),
  examSteps: jsonb("examSteps").$type<{ name: string; videoUrl: string }[]>(),
  stationIndex: integer("station_index"),
  vapiCallId: text("vapi_call_id"),
});

export type Chat = InferSelectModel<typeof chat>;
export type NewChat = InferInsertModel<typeof chat>;

export const message = pgTable("message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: varchar("chatId", { length: 50 })
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  content: text("content").notNull(),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type DBMessage = InferSelectModel<typeof message>;
export type NewMessage = InferInsertModel<typeof message>;

export const suggestion = pgTable("suggestion", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: varchar("chatId", { length: 50 })
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  originalText: text("originalText").notNull(),
  suggestedText: text("suggestedText").notNull(),
  description: text("description"),
  isResolved: boolean("isResolved").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export type Suggestion = InferSelectModel<typeof suggestion>;
export type NewSuggestion = InferInsertModel<typeof suggestion>;

export const stream = pgTable("stream", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: varchar("chatId", { length: 50 })
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  url: text("url"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Stream = InferSelectModel<typeof stream>;
export type NewStream = InferInsertModel<typeof stream>;

export const rubric = pgTable("rubric", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  departmentId: uuid("departmentId")
    .notNull()
    .references(() => department.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Rubric = InferSelectModel<typeof rubric>;
export type NewRubric = InferInsertModel<typeof rubric>;

export const rubricCriteria = pgTable("rubric_criteria", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  rubricId: uuid("rubricId")
    .notNull()
    .references(() => rubric.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  maxScore: integer("maxScore").notNull().default(5),
  weight: integer("weight").notNull().default(1),
});

export type RubricCriteria = InferSelectModel<typeof rubricCriteria>;
export type NewRubricCriteria = InferInsertModel<typeof rubricCriteria>;

export const evaluation = pgTable("evaluation", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: varchar("chatId", { length: 50 })
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  rubricId: uuid("rubricId").references(() => rubric.id),
  evaluatorId: uuid("evaluatorId").references(() => user.id),
  criteriaScores: jsonb("criteriaScores").$type<Record<string, number>>(),
  totalScore: integer("totalScore"),
  grade: varchar("grade", { length: 4 }),
  feedback: text("feedback"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Evaluation = InferSelectModel<typeof evaluation>;
export type NewEvaluation = InferInsertModel<typeof evaluation>;

export const examStep = pgTable("exam_step", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => patientCase.id, { onDelete: "cascade" }).notNull(),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  videoUrl: text("video_url").notNull(),
});

export type ExamStep = InferSelectModel<typeof examStep>;

export const stepFeedback = pgTable("step_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: varchar("chatId", { length: 50 }).references(() => chat.id, { onDelete: "cascade" }).notNull(),
  stepIndex: integer("step_index").notNull(),
  feedback: jsonb("feedback").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type StepFeedback = InferSelectModel<typeof stepFeedback>;
export type NewStepFeedback = InferInsertModel<typeof stepFeedback>;

export const cbtCategory = pgTable("cbt_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  cbtType: cbtTypeEnum("cbt_type").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CBTCategory = InferSelectModel<typeof cbtCategory>;

export const cbtQuestion = pgTable("cbt_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("categoryId").references(() => cbtCategory.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  explanation: text("explanation").notNull(),
  figureUrl: text("figure_url"),
  options: jsonb("options").$type<{text: string, correct: boolean}[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CBTQuestion = InferSelectModel<typeof cbtQuestion>;

export const cbtSelection = pgTable("cbt_selection", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => cbtSession.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => cbtQuestion.id),
  selectedOption: integer("selected_option"),
  firstAttempt: boolean("first_attempt").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CBTSelection = InferSelectModel<typeof cbtSelection>;

export const cbtSelectionRelations = relations(cbtSelection, ({ one }) => ({
  session: one(cbtSession, {
    fields: [cbtSelection.sessionId],
    references: [cbtSession.id],
  }),
  question: one(cbtQuestion, {
    fields: [cbtSelection.questionId],
    references: [cbtQuestion.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(sessionTable),
}));

export const departmentRelations = relations(department, ({ many }) => ({
  patientCases: many(patientCase),
  flashcardTopics: many(flashcardTopic),
  flashcardHistory: many(flashcardHistory),
}));

export const patientCaseRelations = relations(patientCase, ({ one, many }) => ({
  department: one(department, {
    fields: [patientCase.departmentId],
    references: [department.id],
  }),
  patients: many(patient),
}));

export const patientRelations = relations(patient, ({ one }) => ({
  case: one(patientCase, {
    fields: [patient.caseId],
    references: [patientCase.id],
  }),
}));

export const flashcardTopicRelations = relations(flashcardTopic, ({ one }) => ({
  department: one(department, {
    fields: [flashcardTopic.departmentId],
    references: [department.id],
  }),
}));

export const flashcardHistoryRelations = relations(flashcardHistory, ({ one }) => ({
  session: one(sessionTable, {
    fields: [flashcardHistory.sessionId],
    references: [sessionTable.id],
  }),
  department: one(department, {
    fields: [flashcardHistory.departmentId],
    references: [department.id],
  }),
}));

export const sessionRelations = relations(sessionTable, ({ one, many }) => ({
  user: one(user, {
    fields: [sessionTable.userId],
    references: [user.id],
  }),
  department: one(department, {
    fields: [sessionTable.departmentId],
    references: [department.id],
  }),
  case: one(patientCase, {
    fields: [sessionTable.caseId],
    references: [patientCase.id],
  }),
  patient: one(patient, {
    fields: [sessionTable.patientId],
    references: [patient.id],
  }),
  chats: many(chat, {
    relationName: "session_chats",
  }),
  flashcardHistory: many(flashcardHistory),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  session: one(sessionTable, {
    fields: [chat.sessionId],
    references: [sessionTable.id],
    relationName: "session_chats",
  }),
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  patient: one(patient, {
    fields: [chat.patientId],
    references: [patient.id],
  }),
  department: one(department, {  // ADD THIS
    fields: [chat.departmentId],
    references: [department.id],
  }),
  messages: many(message),
  suggestions: many(suggestion),
  streams: many(stream),
  evaluations: many(evaluation),
  stepFeedbacks: many(stepFeedback),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

export const suggestionRelations = relations(suggestion, ({ one }) => ({
  chat: one(chat, {
    fields: [suggestion.chatId],
    references: [chat.id],
  }),
  user: one(user, {
    fields: [suggestion.userId],
    references: [user.id],
  }),
}));

export const streamRelations = relations(stream, ({ one }) => ({
  chat: one(chat, {
    fields: [stream.chatId],
    references: [chat.id],
  }),
}));

export const rubricRelations = relations(rubric, ({ one, many }) => ({
  department: one(department, {
    fields: [rubric.departmentId],
    references: [department.id],
  }),
  criteria: many(rubricCriteria),
}));

export const rubricCriteriaRelations = relations(rubricCriteria, ({ one }) => ({
  rubric: one(rubric, {
    fields: [rubricCriteria.rubricId],
    references: [rubric.id],
  }),
}));

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  chat: one(chat, {
    fields: [evaluation.chatId],
    references: [chat.id],
  }),
  rubric: one(rubric, {
    fields: [evaluation.rubricId],
    references: [rubric.id],
  }),
  evaluator: one(user, {
    fields: [evaluation.evaluatorId],
    references: [user.id],
  }),
}));

export const stepFeedbackRelations = relations(stepFeedback, ({ one }) => ({
  chat: one(chat, {
    fields: [stepFeedback.chatId],
    references: [chat.id],
  }),
}));

export const cbtCategoryRelations = relations(cbtCategory, ({ many }) => ({
  questions: many(cbtQuestion),
}));

export const cbtQuestionRelations = relations(cbtQuestion, ({ one }) => ({
  category: one(cbtCategory, {
    fields: [cbtQuestion.categoryId],
    references: [cbtCategory.id],
  }),
}));

export type FlashcardType = { question: string; answer: string };
export type ManageType   = 'department' | 'case' | 'patient' | 'topic' | 'cbt-category' | 'cbt-question' | null;
export type StationConfig = {
  index: number;
  isAllDepartments: boolean;
  departments: string[];
  cases: Record<string, string[]>;
};
export type ChatHistoryItem = Pick<Chat, 'id' | 'createdAt' | 'title' | 'userId' | 'patientId' | 'status' | 'visibility' | 'vapiCallId'> & {
  patientName?: string;
  type?: string | null;
  latestFeedback?: string | null;
};0
export type Feedback = {
  rating: number;
  percentage: number;
  strengths: { category: string; score: number; evidence: string }[];
  improvements: { category: string; score: number; evidence: string }[];
  suggestions: string[];
  overall_assessment: string;
  step_summary?: Array<{ step_name: string; score: number; key_findings: string }>;
  category_analysis?: Array<{ category: string; score: number; comment: string }>;
};

export const cbtSession = pgTable("cbt_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  cbtType: cbtTypeEnum("cbt_type").notNull(),
  mode: varchar("mode", { length: 20 }).notNull(), 
  categoryId: uuid("category_id").references(() => cbtCategory.id, { onDelete: "set null" }),
  numQuestions: integer("num_questions").notNull(),
  duration: integer("duration"), 
  score: integer("score"), 
  correctAnswers: integer("correct_answers").notNull().default(0),
  wrongAnswers: integer("wrong_answers").notNull().default(0),
  unanswered: integer("unanswered").notNull().default(0),
  completedAt: timestamp("completed_at"), // Make sure this is nullable
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CBTSession = InferSelectModel<typeof cbtSession>;
export type NewCBTSession = InferInsertModel<typeof cbtSession>;

export const cbtSessionRelations = relations(cbtSession, ({ one, many }) => ({
  user: one(user, {
    fields: [cbtSession.userId],
    references: [user.id],
  }),
  category: one(cbtCategory, {
    fields: [cbtSession.categoryId],
    references: [cbtCategory.id],
  }),
  selections: many(cbtSelection),
}));
export const transactionTypeEnum = pgEnum("transaction_type", ["purchase", "usage", "reward"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed"]);

export const tokenPrice = pgTable("token_price", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  tokenAmount: integer("token_amount").notNull(),
  price: integer("price").notNull(), // in kobo (Paystack uses kobo)
  currency: varchar("currency", { length: 3 }).default("NGN"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tokenTransaction = pgTable("token_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: doublePrecision("amount").notNull(), 
  description: text("description").notNull(),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tokenPriceId: uuid("token_price_id").references(() => tokenPrice.id),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  paystackReference: varchar("paystack_reference", { length: 100 }),
  amount: integer("amount").notNull(), // in kobo
  tokenAmount: integer("token_amount").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tokenUsageRate = pgTable("token_usage_rate", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: varchar("service", { length: 50 }).notNull().unique(),
  rate: doublePrecision("rate").notNull(), // Use doublePrecision for floating point numbers
  unit: varchar("unit", { length: 20 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// Add relations
export const tokenTransactionRelations = relations(tokenTransaction, ({ one }) => ({
  user: one(user, {
    fields: [tokenTransaction.userId],
    references: [user.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, {
    fields: [payment.userId],
    references: [user.id],
  }),
  tokenPrice: one(tokenPrice, {
    fields: [payment.tokenPriceId],
    references: [tokenPrice.id],
  }),
}));

export const tokenPriceRelations = relations(tokenPrice, ({ many }) => ({
  payments: many(payment),
}));



// ========== CLINCHERS ==========

export const clincher = pgTable("clincher", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(), // HTML content
  mainFigureUrl: text("main_figure_url"),
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  extraQuestion1: text("extra_question_1"),
  extraQuestion2: text("extra_question_2"),
  extraQuestion3: text("extra_question_3"),
  extraQuestion4: text("extra_question_4"),
  extraQuestion5: text("extra_question_5"),
  extraQuestion6: text("extra_question_6"),
  extraQuestion7: text("extra_question_7"),
  extraAnswer1: text("extra_answer_1"),
  extraAnswer2: text("extra_answer_2"),
  extraAnswer3: text("extra_answer_3"),
  extraAnswer4: text("extra_answer_4"),
  extraAnswer5: text("extra_answer_5"),
  extraAnswer6: text("extra_answer_6"),
  extraAnswer7: text("extra_answer_7"),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Clincher = InferSelectModel<typeof clincher>;

// ========== ACADEMY CATEGORY ==========
// In your schema.ts file, update the academyCategory table:

export const academyCategory = pgTable("academy_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  timeLimit: integer("time_limit"), // in seconds - NULL means use default
  parentId: uuid("parent_id").references((): AnyPgColumn => academyCategory.id),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  typeIdx: index("idx_academy_category_type").on(table.type),
  nameIdx: index("idx_academy_category_name").on(table.name),
  parentIdx: index("idx_academy_category_parent").on(table.parentId),
  createdAtIdx: index("idx_academy_category_created_at").on(table.createdAt),
  timeLimitIdx: index("idx_academy_category_time_limit").on(table.timeLimit),
}));

export type AcademyCategory = InferSelectModel<typeof academyCategory>;

// ========== MAIN MOCK CBT ==========
export const mainMockCBT = pgTable("main_mock_cbt", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizName: varchar("quiz_name", { length: 255 }).notNull(),
  questionId: varchar("question_id", { length: 50 }).notNull(),
  question: text("question").notNull(),
  figureUrl: text("figure_url"),
  explanation: text("explanation").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for main_mock_cbt
  categoryIdx: index("idx_main_mock_cbt_category").on(table.categoryId),
  questionIdIdx: index("idx_main_mock_cbt_question_id").on(table.questionId),
  createdAtIdx: index("idx_main_mock_cbt_created_at").on(table.createdAt),
  quizNameIdx: index("idx_main_mock_cbt_quiz_name").on(table.quizName),
  // Composite index for common queries
  categoryQuestionIdx: index("idx_main_mock_cbt_category_question").on(table.categoryId, table.questionId),
}));

export type MainMockCBT = InferSelectModel<typeof mainMockCBT>;

// ========== MAIN MOCK OSCE ==========
export const mainMockOSCE = pgTable("main_mock_osce", {
  id: uuid("id").primaryKey().defaultRandom(),
  osceName: varchar("osce_name", { length: 255 }).notNull(),
  questionId: varchar("question_id", { length: 50 }).notNull(),
  question: text("question").notNull(),
  figureUrl: text("figure_url"),
  explanation: text("explanation").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for main_mock_osce
  categoryIdx: index("idx_main_mock_osce_category").on(table.categoryId),
  questionIdIdx: index("idx_main_mock_osce_question_id").on(table.questionId),
  createdAtIdx: index("idx_main_mock_osce_created_at").on(table.createdAt),
  osceNameIdx: index("idx_main_mock_osce_name").on(table.osceName),
  categoryQuestionIdx: index("idx_main_mock_osce_category_question").on(table.categoryId, table.questionId),
}));

export type MainMockOSCE = InferSelectModel<typeof mainMockOSCE>;

// ========== MINI MOCK CBT ==========
export const miniMockCBT = pgTable("mini_mock_cbt", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizName: varchar("quiz_name", { length: 255 }).notNull(),
  questionId: varchar("question_id", { length: 50 }).notNull(),
  question: text("question").notNull(),
  figureUrl: text("figure_url"),
  explanation: text("explanation").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for mini_mock_cbt
  categoryIdx: index("idx_mini_mock_cbt_category").on(table.categoryId),
  questionIdIdx: index("idx_mini_mock_cbt_question_id").on(table.questionId),
  createdAtIdx: index("idx_mini_mock_cbt_created_at").on(table.createdAt),
  quizNameIdx: index("idx_mini_mock_cbt_quiz_name").on(table.quizName),
  categoryQuestionIdx: index("idx_mini_mock_cbt_category_question").on(table.categoryId, table.questionId),
}));

export type MiniMockCBT = InferSelectModel<typeof miniMockCBT>;

// ========== MINI MOCK OSCE ==========
export const miniMockOSCE = pgTable("mini_mock_osce", {
  id: uuid("id").primaryKey().defaultRandom(),
  osceName: varchar("osce_name", { length: 255 }).notNull(),
  questionId: varchar("question_id", { length: 50 }).notNull(),
  question: text("question").notNull(),
  figureUrl: text("figure_url"),
  correctAnswers: text("correct_answers").notNull(),
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for mini_mock_osce
  categoryIdx: index("idx_mini_mock_osce_category").on(table.categoryId),
  questionIdIdx: index("idx_mini_mock_osce_question_id").on(table.questionId),
  createdAtIdx: index("idx_mini_mock_osce_created_at").on(table.createdAt),
  osceNameIdx: index("idx_mini_mock_osce_name").on(table.osceName),
  categoryQuestionIdx: index("idx_mini_mock_osce_category_question").on(table.categoryId, table.questionId),
}));

export type MiniMockOSCE = InferSelectModel<typeof miniMockOSCE>;

// ========== QBLOCK ==========
export const qblock = pgTable("qblock", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  quizName: varchar("quiz_name", { length: 255 }).notNull(),
  answer1: text("answer_1").notNull(),
  answer2: text("answer_2").notNull(),
  answer3: text("answer_3").notNull(),
  answer4: text("answer_4").notNull(),
  correctAnswer: integer("correct_answer").notNull(), 
  categoryId: uuid("category_id").references(() => academyCategory.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for qblock
  categoryIdx: index("idx_qblock_category").on(table.categoryId),
  quizNameIdx: index("idx_qblock_quiz_name").on(table.quizName),
  createdAtIdx: index("idx_qblock_created_at").on(table.createdAt),
  categoryQuizIdx: index("idx_qblock_category_quiz").on(table.categoryId, table.quizName),
}));

export type QBlock = InferSelectModel<typeof qblock>;

// ========== QTOPIC ==========
export const qtopic = pgTable("qtopic", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(), 
  question: text("question").notNull(),
  explanation: text("explanation"),
  figureUrl: text("figure_url"),
  answer1: text("answer_1").notNull(),
  answer2: text("answer_2").notNull(),
  answer3: text("answer_3").notNull(),
  answer4: text("answer_4").notNull(),
  answer5: text("answer_5"), 
  correctAnswer: integer("correct_answer").notNull(), 
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  // Indexes for qtopic
  categoryIdx: index("idx_qtopic_category").on(table.category),
  topicIdx: index("idx_qtopic_topic").on(table.topic),
  createdAtIdx: index("idx_qtopic_created_at").on(table.createdAt),
  categoryTopicIdx: index("idx_qtopic_category_topic").on(table.category, table.topic),
}));

export type QTopic = InferSelectModel<typeof qtopic>;

// ========== QUIZ ==========

export const quizCategory = pgTable("quiz_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'mcq', 'picture_test', 'dental'
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuizCategory = InferSelectModel<typeof quizCategory>;

// Quiz Questions
export const quizQuestion = pgTable("quiz_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  categoryId: uuid("category_id").references(() => quizCategory.id, { onDelete: "set null" }),
  answer1: text("answer_1").notNull(),
  answer2: text("answer_2").notNull(),
  answer3: text("answer_3").notNull(),
  answer4: text("answer_4").notNull(),
  correctAnswer: integer("correct_answer").notNull(), // 1-4 (0-based or 1-based? Let's check)
  figureUrl: text("figure_url"), // For picture tests
  explanation: text("explanation"), // HTML explanation
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuizQuestion = InferSelectModel<typeof quizQuestion>;

// Quiz Sessions (track user progress)
export const quizSession = pgTable("quiz_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
  quizId: uuid("quiz_id").references(() => quizCategory.id),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").default(0),
  wrongAnswers: integer("wrong_answers").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuizSession = InferSelectModel<typeof quizSession>;

// User Answers for Quiz
export const quizAnswer = pgTable("quiz_answer", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => quizSession.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").references(() => quizQuestion.id),
  selectedAnswer: integer("selected_answer"),
  isCorrect: boolean("is_correct"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuizAnswer = InferSelectModel<typeof quizAnswer>;

// ========== GAMES ==========
// ========== GAMES ==========
export const gameTypeEnum = pgEnum("game_type", ["quiz", "matching", "flashcard", "timed"]);
export const gameStatusEnum = pgEnum("game_status", ["active", "draft", "archived"]);

// Main Games Table
export const game = pgTable("game", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  type: gameTypeEnum("type").notNull().default("quiz"),
  description: text("description"),
  status: gameStatusEnum("status").notNull().default("active"),
  totalQuestions: integer("total_questions").default(0),
  totalPlays: integer("total_plays").default(0),
  averageScore: integer("average_score").default(0),
  timeLimit: integer("time_limit"), // in seconds, for timed games
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Game = InferSelectModel<typeof game>;
export type NewGame = InferInsertModel<typeof game>;

// Game Questions Table
export const gameQuestion = pgTable("game_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => game.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(), // HTML content
  timeLimit: integer("time_limit"), // per question time limit (seconds)
  figureUrl: text("figure_url"),
  seen: boolean("seen").default(false), // 'Seen' column from CSV
  seenBy: text("seen_by"), // 'Seen By' column from CSV
  order: integer("order").notNull(), // question order in the game
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameQuestion = InferSelectModel<typeof gameQuestion>;
export type NewGameQuestion = InferInsertModel<typeof gameQuestion>;

// Game Sessions (track user progress)
export const gameSession = pgTable("game_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => game.id, { onDelete: "cascade" }).notNull(),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").default(0),
  wrongAnswers: integer("wrong_answers").default(0),
  timeTaken: integer("time_taken"), // total time taken in seconds
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameSession = InferSelectModel<typeof gameSession>;
export type NewGameSession = InferInsertModel<typeof gameSession>;

// Game Answers (track user responses)
export const gameAnswer = pgTable("game_answer", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => gameSession.id, { onDelete: "cascade" }).notNull(),
  questionId: uuid("question_id").references(() => gameQuestion.id, { onDelete: "cascade" }).notNull(),
  userAnswer: text("user_answer"),
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"), // seconds spent on this question
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameAnswer = InferSelectModel<typeof gameAnswer>;
export type NewGameAnswer = InferInsertModel<typeof gameAnswer>;

// Add relations for games
export const gameRelations = relations(game, ({ one, many }) => ({
  creator: one(user, {
    fields: [game.createdById],
    references: [user.id],
  }),
  questions: many(gameQuestion),
  sessions: many(gameSession),
}));

export const gameQuestionRelations = relations(gameQuestion, ({ one, many }) => ({
  game: one(game, {
    fields: [gameQuestion.gameId],
    references: [game.id],
  }),
  answers: many(gameAnswer),
}));

export const gameSessionRelations = relations(gameSession, ({ one, many }) => ({
  user: one(user, {
    fields: [gameSession.userId],
    references: [user.id],
  }),
  game: one(game, {
    fields: [gameSession.gameId],
    references: [game.id],
  }),
  answers: many(gameAnswer),
}));

export const gameAnswerRelations = relations(gameAnswer, ({ one }) => ({
  session: one(gameSession, {
    fields: [gameAnswer.sessionId],
    references: [gameSession.id],
  }),
  question: one(gameQuestion, {
    fields: [gameAnswer.questionId],
    references: [gameQuestion.id],
  }),
}));

// ========== LECTURE NOTES ==========
export const lectureNote = pgTable("lecture_note", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileType: varchar("file_type", { length: 50 }), // 'pdf', 'doc', 'txt'
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LectureNote = InferSelectModel<typeof lectureNote>;

// ========== COURSES ==========
export const course = pgTable("course", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Course = InferSelectModel<typeof course>;

export const courseModule = pgTable("course_module", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => course.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  order: integer("order").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CourseModule = InferSelectModel<typeof courseModule>;

// ========== CHECKLISTS ==========
export const checklist = pgTable("checklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  items: jsonb("items").$type<string[]>().notNull(),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Checklist = InferSelectModel<typeof checklist>;

// User checklist progress
export const checklistProgress = pgTable("checklist_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
  checklistId: uuid("checklist_id").references(() => checklist.id, { onDelete: "cascade" }),
  completedItems: jsonb("completed_items").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ChecklistProgress = InferSelectModel<typeof checklistProgress>;

// Add to your schema.ts file

export const passwordResetToken = pgTable("password_reset_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = InferSelectModel<typeof passwordResetToken>;
export type NewPasswordResetToken = InferInsertModel<typeof passwordResetToken>;

// Add relations
export const passwordResetTokenRelations = relations(passwordResetToken, ({ one }) => ({
  user: one(user, {
    fields: [passwordResetToken.userId],
    references: [user.id],
  }),
}));

// Application access control tables
export const application = pgTable("application", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Font Awesome icon class
  color: varchar("color", { length: 50 }).default("blue"),
  isActive: boolean("is_active").default(true),
  requiresApproval: boolean("requires_approval").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Application = InferSelectModel<typeof application>;
export type NewApplication = InferInsertModel<typeof application>;

export const userApplicationAccess = pgTable("user_application_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => application.id, { onDelete: "cascade" }),
  isApproved: boolean("is_approved").default(false),
  approvedBy: uuid("approved_by").references(() => user.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  unique: uniqueIndex("unique_user_application").on(table.userId, table.applicationId),
}));

export type UserApplicationAccess = InferSelectModel<typeof userApplicationAccess>;
export type NewUserApplicationAccess = InferInsertModel<typeof userApplicationAccess>;

// Add relations
export const applicationRelations = relations(application, ({ many }) => ({
  userAccess: many(userApplicationAccess),
}));

export const userApplicationAccessRelations = relations(userApplicationAccess, ({ one }) => ({
  user: one(user, {
    fields: [userApplicationAccess.userId],
    references: [user.id],
  }),
  application: one(application, {
    fields: [userApplicationAccess.applicationId],
    references: [application.id],
  }),
  approver: one(user, {
    fields: [userApplicationAccess.approvedBy],
    references: [user.id],
  }),
}));

// User Activity Tracking
export const userActivity = pgTable("user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => application.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id"), // Optional: link to specific session
  activityType: varchar("activity_type", { length: 50 }).notNull(), // 'session_start', 'question_attempt', 'score', etc.
  metadata: jsonb("metadata"), // Store additional data like score, time spent, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_user_activity_user").on(table.userId),
  appIdx: index("idx_user_activity_app").on(table.applicationId),
  typeIdx: index("idx_user_activity_type").on(table.activityType),
  createdAtIdx: index("idx_user_activity_created_at").on(table.createdAt),
}));

export type UserActivity = InferSelectModel<typeof userActivity>;
export type NewUserActivity = InferInsertModel<typeof userActivity>;

// User Performance Metrics
export const userPerformance = pgTable("user_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => application.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }), // e.g., 'cardiology', 'neurology', 'clinical_reasoning'
  totalAttempts: integer("total_attempts").default(0),
  correctAttempts: integer("correct_attempts").default(0),
  averageScore: doublePrecision("average_score").default(0),
  timeSpent: integer("time_spent").default(0), // in seconds
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  unique: uniqueIndex("unique_user_app_category").on(table.userId, table.applicationId, table.category),
  userAppIdx: index("idx_user_performance_user_app").on(table.userId, table.applicationId),
}));

export type UserPerformance = InferSelectModel<typeof userPerformance>;
export type NewUserPerformance = InferInsertModel<typeof userPerformance>;

// Add relations
export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(user, {
    fields: [userActivity.userId],
    references: [user.id],
  }),
  application: one(application, {
    fields: [userActivity.applicationId],
    references: [application.id],
  }),
}));

export const userPerformanceRelations = relations(userPerformance, ({ one }) => ({
  user: one(user, {
    fields: [userPerformance.userId],
    references: [user.id],
  }),
  application: one(application, {
    fields: [userPerformance.applicationId],
    references: [application.id],
  }),
}));

// Add this to your schema.ts file

export const adImage = pgTable("ad_image", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdById: uuid("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  activeIdx: index("idx_ad_images_active").on(table.isActive),
  orderIdx: index("idx_ad_images_order").on(table.order),
  dateRangeIdx: index("idx_ad_images_date_range").on(table.startDate, table.endDate),
}));

export type AdImage = InferSelectModel<typeof adImage>;
export type NewAdImage = InferInsertModel<typeof adImage>;

// Add relations
export const adImageRelations = relations(adImage, ({ one }) => ({
  creator: one(user, {
    fields: [adImage.createdById],
    references: [user.id],
  }),
}));

// Add to your schema.ts file

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  showChiefComplaint: boolean("show_chief_complaint").notNull().default(true),
  showPresentingCondition: boolean("show_presenting_condition").notNull().default(true),
  departmentSelectionMode: varchar("department_selection_mode", { length: 20 }).notNull().default("allow_select"),
  selectedDepartmentCount: integer("selected_department_count").notNull().default(3),
  allowUserDepartmentChoice: boolean("allow_user_department_choice").notNull().default(false),
  updatedBy: uuid("updated_by").references(() => user.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminSettings = InferSelectModel<typeof adminSettings>;
export type NewAdminSettings = InferInsertModel<typeof adminSettings>;

// Add relations
export const adminSettingsRelations = relations(adminSettings, ({ one }) => ({
  updater: one(user, {
    fields: [adminSettings.updatedBy],
    references: [user.id],
  }),
}));