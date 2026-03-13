-- Company Academy expansion: course targeting, richer module resources, certification metadata

ALTER TABLE "Course"
ADD COLUMN "learningPath" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "position" TEXT,
ADD COLUMN "certificateTitle" TEXT;

ALTER TABLE "CourseModule"
ADD COLUMN "resourceUrl" TEXT;

ALTER TABLE "CourseEnrollment"
ADD COLUMN "certificateAwardedAt" TIMESTAMP(3);
