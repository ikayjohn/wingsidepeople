CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'direct',
  "directKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_directKey_key"
ON "Conversation"("directKey");

CREATE INDEX IF NOT EXISTS "Conversation_updatedAt_idx"
ON "Conversation"("updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "ConversationMember" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConversationMember_conversationId_userId_key"
ON "ConversationMember"("conversationId", "userId");

CREATE INDEX IF NOT EXISTS "ConversationMember_userId_createdAt_idx"
ON "ConversationMember"("userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
ON "Message"("conversationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx"
ON "Message"("senderId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationMember_conversationId_fkey') THEN
    ALTER TABLE "ConversationMember"
    ADD CONSTRAINT "ConversationMember_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationMember_userId_fkey') THEN
    ALTER TABLE "ConversationMember"
    ADD CONSTRAINT "ConversationMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_conversationId_fkey') THEN
    ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_senderId_fkey') THEN
    ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
