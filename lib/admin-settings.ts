import { prisma } from "@/lib/prisma"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

const DEFAULT_SINGLETON_ID = "default"

export const DEFAULT_COMPANY_PROFILE = {
  id: DEFAULT_SINGLETON_ID,
  companyName: "Wingside",
  legalName: null as string | null,
  tagline: "Employees Portal",
  supportEmail: null as string | null,
  supportPhone: null as string | null,
  websiteUrl: null as string | null,
  headquartersLocation: null as string | null,
}

export const DEFAULT_EMPLOYMENT_DEFAULTS = {
  id: DEFAULT_SINGLETON_ID,
  defaultEmploymentType: "full_time",
  defaultAnnualLeaveAllowance: 20,
  standardWorkWeekDays: 5,
  standardWorkHoursPerDay: 8,
  defaultProbationMonths: 3,
}

export const DEFAULT_SECURITY_ACCESS_RULES = {
  id: DEFAULT_SINGLETON_ID,
  allowSelfServiceRegistration: true,
  allowedEmailDomain: "wingside.ng",
  employeeIdPrefix: "WS",
  employeeIdDigits: 4,
  passwordMinLength: 8,
  autoAssignManagersFromOrgChart: true,
  workflowFallbackReviewerRole: "hr" as string | null,
  enforceAdminIpAllowlist: false,
  adminIpAllowlist: null as string | null,
}

type SingletonWhere = { where: { id: string } }
type SingletonUpsert = { where: { id: string }; update: Record<string, unknown>; create: Record<string, unknown> }

type SettingsPrismaClient = {
  companyProfile: {
    findUnique(args: SingletonWhere): Promise<Record<string, unknown> | null>
    upsert(args: SingletonUpsert): Promise<unknown>
  }
  employmentDefaults: {
    findUnique(args: SingletonWhere): Promise<Record<string, unknown> | null>
    upsert(args: SingletonUpsert): Promise<unknown>
  }
  securityAccessRule: {
    findUnique(args: SingletonWhere): Promise<Record<string, unknown> | null>
    upsert(args: SingletonUpsert): Promise<unknown>
  }
}

export const settingsPrisma = prisma as unknown as SettingsPrismaClient

export function getEmployeeIdExample(prefix: string, digits: number) {
  return `${prefix}${"0".repeat(Math.max(1, digits))}`
}

export function getEmployeeIdRegex(prefix: string, digits: number) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`^${escapedPrefix}\\d{${digits}}$`)
}

export async function getCompanyProfile() {
  if (!hasPrismaDelegates("companyProfile")) {
    return DEFAULT_COMPANY_PROFILE
  }

  let profile: Record<string, unknown> | null = null
  try {
    profile = await settingsPrisma.companyProfile.findUnique({
      where: { id: DEFAULT_SINGLETON_ID },
    })
  } catch {
    return DEFAULT_COMPANY_PROFILE
  }

  return {
    ...DEFAULT_COMPANY_PROFILE,
    ...profile,
  }
}

export async function getEmploymentDefaults() {
  if (!hasPrismaDelegates("employmentDefaults")) {
    return DEFAULT_EMPLOYMENT_DEFAULTS
  }

  let defaults: Record<string, unknown> | null = null
  try {
    defaults = await settingsPrisma.employmentDefaults.findUnique({
      where: { id: DEFAULT_SINGLETON_ID },
    })
  } catch {
    return DEFAULT_EMPLOYMENT_DEFAULTS
  }

  return {
    ...DEFAULT_EMPLOYMENT_DEFAULTS,
    ...defaults,
  }
}

export async function getSecurityAccessRules() {
  if (!hasPrismaDelegates("securityAccessRule")) {
    return DEFAULT_SECURITY_ACCESS_RULES
  }

  let rules: Record<string, unknown> | null = null
  try {
    rules = await settingsPrisma.securityAccessRule.findUnique({
      where: { id: DEFAULT_SINGLETON_ID },
    })
  } catch {
    return DEFAULT_SECURITY_ACCESS_RULES
  }

  return {
    ...DEFAULT_SECURITY_ACCESS_RULES,
    ...rules,
  }
}
