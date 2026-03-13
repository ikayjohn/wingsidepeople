-- Attendance tracking for employee check-in, check-out, and overtime

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentSnapshot" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "workedMinutes" INTEGER,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendanceRecord_userId_checkInAt_idx" ON "AttendanceRecord"("userId", "checkInAt" DESC);
CREATE INDEX "AttendanceRecord_departmentSnapshot_checkInAt_idx" ON "AttendanceRecord"("departmentSnapshot", "checkInAt" DESC);
CREATE INDEX "AttendanceRecord_status_checkInAt_idx" ON "AttendanceRecord"("status", "checkInAt" DESC);

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
