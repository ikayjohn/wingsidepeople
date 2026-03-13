-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Wingside',
    "legalName" TEXT,
    "tagline" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "websiteUrl" TEXT,
    "headquartersLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentDefaults" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultEmploymentType" TEXT NOT NULL DEFAULT 'full_time',
    "defaultAnnualLeaveAllowance" INTEGER NOT NULL DEFAULT 20,
    "standardWorkWeekDays" INTEGER NOT NULL DEFAULT 5,
    "standardWorkHoursPerDay" INTEGER NOT NULL DEFAULT 8,
    "defaultProbationMonths" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAccessRule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "allowSelfServiceRegistration" BOOLEAN NOT NULL DEFAULT true,
    "allowedEmailDomain" TEXT NOT NULL DEFAULT 'wingside.ng',
    "employeeIdPrefix" TEXT NOT NULL DEFAULT 'WS',
    "employeeIdDigits" INTEGER NOT NULL DEFAULT 4,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "enforceAdminIpAllowlist" BOOLEAN NOT NULL DEFAULT false,
    "adminIpAllowlist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityAccessRule_pkey" PRIMARY KEY ("id")
);
