-- Expand offboarding workflow with exit survey linkage and final HR approvals

ALTER TABLE "OffboardingChecklist"
ADD COLUMN IF NOT EXISTS "initiatedById" TEXT,
ADD COLUMN IF NOT EXISTS "exitInterviewCompletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "assetsClearedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "finalHrApprovedById" TEXT,
ADD COLUMN IF NOT EXISTS "finalApprovalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "finalHrApprovedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "OffboardingChecklist_exitInterviewId_idx"
ON "OffboardingChecklist"("exitInterviewId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OffboardingChecklist_initiatedById_fkey') THEN
    ALTER TABLE "OffboardingChecklist"
    ADD CONSTRAINT "OffboardingChecklist_initiatedById_fkey"
    FOREIGN KEY ("initiatedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OffboardingChecklist_exitInterviewId_fkey') THEN
    ALTER TABLE "OffboardingChecklist"
    ADD CONSTRAINT "OffboardingChecklist_exitInterviewId_fkey"
    FOREIGN KEY ("exitInterviewId") REFERENCES "Survey"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OffboardingChecklist_finalHrApprovedById_fkey') THEN
    ALTER TABLE "OffboardingChecklist"
    ADD CONSTRAINT "OffboardingChecklist_finalHrApprovedById_fkey"
    FOREIGN KEY ("finalHrApprovedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
