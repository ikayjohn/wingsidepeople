-- Phase C: Recognition + birthdays + anniversaries

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "employmentStartDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Recognition" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recognition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Recognition_toUserId_createdAt_idx"
ON "Recognition"("toUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Recognition_isPublic_createdAt_idx"
ON "Recognition"("isPublic", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "BirthdayWish" (
  "id" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BirthdayWish_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BirthdayWish_toUserId_createdAt_idx"
ON "BirthdayWish"("toUserId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recognition_fromUserId_fkey') THEN
    ALTER TABLE "Recognition"
    ADD CONSTRAINT "Recognition_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recognition_toUserId_fkey') THEN
    ALTER TABLE "Recognition"
    ADD CONSTRAINT "Recognition_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BirthdayWish_toUserId_fkey') THEN
    ALTER TABLE "BirthdayWish"
    ADD CONSTRAINT "BirthdayWish_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BirthdayWish_fromUserId_fkey') THEN
    ALTER TABLE "BirthdayWish"
    ADD CONSTRAINT "BirthdayWish_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
