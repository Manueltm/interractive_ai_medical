-- Migration file to fix varchar/uuid compatibility issues

-- First, drop all foreign key constraints that reference chat.id
ALTER TABLE IF EXISTS "message" DROP CONSTRAINT IF EXISTS "message_chatId_chat_id_fk";
ALTER TABLE IF EXISTS "suggestion" DROP CONSTRAINT IF EXISTS "suggestion_chatId_chat_id_fk";
ALTER TABLE IF EXISTS "stream" DROP CONSTRAINT IF EXISTS "stream_chatId_chat_id_fk";
ALTER TABLE IF EXISTS "evaluation" DROP CONSTRAINT IF EXISTS "evaluation_chatId_chat_id_fk";
ALTER TABLE IF EXISTS "step_feedback" DROP CONSTRAINT IF EXISTS "step_feedback_chatId_chat_id_fk";

-- Convert all columns to text first as an intermediate step
ALTER TABLE "chat" ALTER COLUMN "id" TYPE text USING "id"::text;
ALTER TABLE "message" ALTER COLUMN "chatId" TYPE text USING "chatId"::text;
ALTER TABLE "suggestion" ALTER COLUMN "chatId" TYPE text USING "chatId"::text;
ALTER TABLE "stream" ALTER COLUMN "chatId" TYPE text USING "chatId"::text;
ALTER TABLE "evaluation" ALTER COLUMN "chatId" TYPE text USING "chatId"::text;
ALTER TABLE "step_feedback" ALTER COLUMN "chatId" TYPE text USING "chatId"::text;

-- Clean up orphaned records now that all are text
DELETE FROM "message" WHERE "chatId" NOT IN (SELECT "id" FROM "chat");
DELETE FROM "suggestion" WHERE "chatId" NOT IN (SELECT "id" FROM "chat");
DELETE FROM "stream" WHERE "chatId" NOT IN (SELECT "id" FROM "chat");
DELETE FROM "evaluation" WHERE "chatId" NOT IN (SELECT "id" FROM "chat");
DELETE FROM "step_feedback" WHERE "chatId" NOT IN (SELECT "id" FROM "chat");

-- Now convert to final varchar(50) types
ALTER TABLE "chat" ALTER COLUMN "id" TYPE varchar(50);
ALTER TABLE "message" ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE "suggestion" ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE "stream" ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE "evaluation" ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE "step_feedback" ALTER COLUMN "chatId" TYPE varchar(50);

-- Re-add foreign key constraints (now both sides are varchar(50))
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "step_feedback" ADD CONSTRAINT "step_feedback_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;