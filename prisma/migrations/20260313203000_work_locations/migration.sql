-- Admin-managed work locations for signup and HR workflows

CREATE TABLE IF NOT EXISTS "WorkLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkLocation_name_key" ON "WorkLocation"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkLocation_code_key" ON "WorkLocation"("code");
CREATE INDEX IF NOT EXISTS "WorkLocation_isActive_sortOrder_name_idx" ON "WorkLocation"("isActive", "sortOrder", "name");
