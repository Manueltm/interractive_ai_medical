-- Drop all foreign key constraints first
ALTER TABLE message DROP CONSTRAINT IF EXISTS message_chatId_chat_id_fk;
ALTER TABLE suggestion DROP CONSTRAINT IF EXISTS suggestion_chatId_chat_id_fk;
ALTER TABLE stream DROP CONSTRAINT IF EXISTS stream_chatId_chat_id_fk;
ALTER TABLE evaluation DROP CONSTRAINT IF EXISTS evaluation_chatId_chat_id_fk;
ALTER TABLE step_feedback DROP CONSTRAINT IF EXISTS step_feedback_chatId_chat_id_fk;

-- Convert any uuid chatId columns to varchar(50)
ALTER TABLE message ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE suggestion ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE stream ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE evaluation ALTER COLUMN "chatId" TYPE varchar(50);
ALTER TABLE step_feedback ALTER COLUMN "chatId" TYPE varchar(50);

-- Recreate foreign key constraints
ALTER TABLE message ADD CONSTRAINT message_chatId_chat_id_fk 
  FOREIGN KEY ("chatId") REFERENCES chat(id) ON DELETE CASCADE;
ALTER TABLE suggestion ADD CONSTRAINT suggestion_chatId_chat_id_fk 
  FOREIGN KEY ("chatId") REFERENCES chat(id) ON DELETE CASCADE;
ALTER TABLE stream ADD CONSTRAINT stream_chatId_chat_id_fk 
  FOREIGN KEY ("chatId") REFERENCES chat(id) ON DELETE CASCADE;
ALTER TABLE evaluation ADD CONSTRAINT evaluation_chatId_chat_id_fk 
  FOREIGN KEY ("chatId") REFERENCES chat(id) ON DELETE CASCADE;
ALTER TABLE step_feedback ADD CONSTRAINT step_feedback_chatId_chat_id_fk 
  FOREIGN KEY ("chatId") REFERENCES chat(id) ON DELETE CASCADE;