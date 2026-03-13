-- Department strategy documents and summaries

CREATE TABLE "DepartmentStrategy" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentStrategy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DepartmentStrategy_departmentId_publishedAt_idx" ON "DepartmentStrategy"("departmentId", "publishedAt" DESC);

ALTER TABLE "DepartmentStrategy" ADD CONSTRAINT "DepartmentStrategy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentStrategy" ADD CONSTRAINT "DepartmentStrategy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
