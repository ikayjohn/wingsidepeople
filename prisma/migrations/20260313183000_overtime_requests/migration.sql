-- Overtime request workflow: employee submission, line manager approval, HR confirmation

CREATE TABLE IF NOT EXISTS "OvertimeRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lineManagerId" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "minutes" INTEGER NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending_manager',
  "managerDecision" TEXT NOT NULL DEFAULT 'pending',
  "managerNotes" TEXT,
  "managerReviewedAt" TIMESTAMP(3),
  "hrDecision" TEXT NOT NULL DEFAULT 'pending',
  "hrReviewerId" TEXT,
  "hrNotes" TEXT,
  "hrReviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OvertimeRequest_userId_status_createdAt_idx"
ON "OvertimeRequest"("userId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "OvertimeRequest_lineManagerId_managerDecision_createdAt_idx"
ON "OvertimeRequest"("lineManagerId", "managerDecision", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "OvertimeRequest_status_workDate_idx"
ON "OvertimeRequest"("status", "workDate" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OvertimeRequest_userId_fkey') THEN
    ALTER TABLE "OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OvertimeRequest_lineManagerId_fkey') THEN
    ALTER TABLE "OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_lineManagerId_fkey"
    FOREIGN KEY ("lineManagerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OvertimeRequest_hrReviewerId_fkey') THEN
    ALTER TABLE "OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_hrReviewerId_fkey"
    FOREIGN KEY ("hrReviewerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
