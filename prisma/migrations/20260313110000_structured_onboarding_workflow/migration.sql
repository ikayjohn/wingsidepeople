-- Structured onboarding workflow: typed stages, employee submissions, and file evidence

ALTER TABLE "OnboardingItem"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'reading',
ADD COLUMN "resourceUrl" TEXT,
ADD COLUMN "content" TEXT,
ADD COLUMN "config" JSONB;

ALTER TABLE "ChecklistProgress"
ADD COLUMN "submissionText" TEXT,
ADD COLUMN "submissionData" JSONB,
ADD COLUMN "uploadedFilename" TEXT,
ADD COLUMN "uploadedFilepath" TEXT,
ADD COLUMN "uploadedFilesize" INTEGER,
ADD COLUMN "uploadedMimetype" TEXT;
