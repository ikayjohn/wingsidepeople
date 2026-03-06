-- Phase B: Leave & Requests

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "annualLeaveAllowance" INTEGER NOT NULL DEFAULT 20;

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leaveType" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "days" INTEGER NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedById" TEXT,
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_status_createdAt_idx"
ON "LeaveRequest"("userId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "LeaveRequest_status_startDate_idx"
ON "LeaveRequest"("status", "startDate");

CREATE TABLE IF NOT EXISTS "HRRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "reviewedById" TEXT,
  "response" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HRRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HRRequest_userId_status_createdAt_idx"
ON "HRRequest"("userId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "HRRequest_status_type_createdAt_idx"
ON "HRRequest"("status", "type", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_userId_fkey') THEN
    ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_reviewedById_fkey') THEN
    ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HRRequest_userId_fkey') THEN
    ALTER TABLE "HRRequest"
    ADD CONSTRAINT "HRRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HRRequest_reviewedById_fkey') THEN
    ALTER TABLE "HRRequest"
    ADD CONSTRAINT "HRRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
