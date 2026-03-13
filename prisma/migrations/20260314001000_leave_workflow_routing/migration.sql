ALTER TABLE "SecurityAccessRule"
ADD COLUMN "autoAssignManagersFromOrgChart" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "workflowFallbackReviewerRole" TEXT DEFAULT 'hr';

ALTER TABLE "LeaveRequest"
ADD COLUMN "lineManagerId" TEXT,
ADD COLUMN "managerDecision" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "managerNotes" TEXT,
ADD COLUMN "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN "hrDecision" TEXT NOT NULL DEFAULT 'pending';

UPDATE "LeaveRequest"
SET
  "status" = CASE
    WHEN "status" = 'approved' THEN 'approved'
    WHEN "status" = 'rejected' THEN 'rejected'
    ELSE 'pending_hr'
  END,
  "managerDecision" = CASE
    WHEN "status" = 'approved' THEN 'approved'
    WHEN "status" = 'rejected' THEN 'rejected'
    ELSE 'approved'
  END,
  "hrDecision" = CASE
    WHEN "status" = 'approved' THEN 'approved'
    WHEN "status" = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END;

CREATE INDEX "LeaveRequest_lineManagerId_managerDecision_createdAt_idx" ON "LeaveRequest"("lineManagerId", "managerDecision", "createdAt" DESC);

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_lineManagerId_fkey"
FOREIGN KEY ("lineManagerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
