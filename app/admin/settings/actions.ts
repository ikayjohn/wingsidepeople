"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { canAccessAdminSection } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { settingsPrisma } from "@/lib/admin-settings"
import { prisma } from "@/lib/prisma"
import { getUserAvatarUrl } from "@/lib/avatar"
import { ORG_ROLE_RECORDS } from "@/lib/org-structure"
import type { UserRole } from "@/lib/rbac"

const SETTINGS_ID = "default"

async function requireSettingsAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "settings")) {
    throw new Error("Unauthorized")
  }

  return session
}

function parseCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on"
}

async function assertNoOrgCycle(roleId: string, parentRoleId: string | null) {
  if (!parentRoleId) return
  if (roleId === parentRoleId) {
    throw new Error("A role cannot be its own parent")
  }

  let currentParentId: string | null = parentRoleId
  while (currentParentId) {
    if (currentParentId === roleId) {
      throw new Error("This parent assignment would create a reporting cycle.")
    }

    const parent: { parentRoleId: string | null } | null = await prisma.orgRole.findUnique({
      where: { id: currentParentId },
      select: { parentRoleId: true },
    })
    currentParentId = parent?.parentRoleId || null
  }
}

function revalidateSettingsPaths() {
  revalidatePath("/admin/settings")
  revalidatePath("/admin/settings/company")
  revalidatePath("/admin/settings/employment")
  revalidatePath("/admin/settings/organization")
  revalidatePath("/admin/settings/security")
  revalidatePath("/admin/employees")
  revalidatePath("/admin/org-chart")
  revalidatePath("/org-chart")
  revalidatePath("/profile")
  revalidatePath("/register")
}

export async function updateCompanyProfile(formData: FormData) {
  const session = await requireSettingsAccess()
  const data = z.object({
    companyName: z.string().trim().min(2).max(120),
    legalName: z.string().trim().max(160).optional(),
    tagline: z.string().trim().max(160).optional(),
    supportEmail: z.string().trim().email().max(160).optional(),
    supportPhone: z.string().trim().max(40).optional(),
    websiteUrl: z.string().trim().url().max(200).optional(),
    headquartersLocation: z.string().trim().max(160).optional(),
  }).parse({
    companyName: formData.get("companyName"),
    legalName: formData.get("legalName") || undefined,
    tagline: formData.get("tagline") || undefined,
    supportEmail: formData.get("supportEmail") || undefined,
    supportPhone: formData.get("supportPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    headquartersLocation: formData.get("headquartersLocation") || undefined,
  })

  await settingsPrisma.companyProfile.upsert({
    where: { id: SETTINGS_ID },
    update: {
      companyName: data.companyName,
      legalName: data.legalName || null,
      tagline: data.tagline || null,
      supportEmail: data.supportEmail || null,
      supportPhone: data.supportPhone || null,
      websiteUrl: data.websiteUrl || null,
      headquartersLocation: data.headquartersLocation || null,
    },
    create: {
      id: SETTINGS_ID,
      companyName: data.companyName,
      legalName: data.legalName || null,
      tagline: data.tagline || null,
      supportEmail: data.supportEmail || null,
      supportPhone: data.supportPhone || null,
      websiteUrl: data.websiteUrl || null,
      headquartersLocation: data.headquartersLocation || null,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: "update_company_profile",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: data,
  })

  revalidateSettingsPaths()
}

export async function updateEmploymentDefaults(formData: FormData) {
  const session = await requireSettingsAccess()
  const data = z.object({
    defaultEmploymentType: z.enum(["full_time", "part_time", "contract", "intern"]),
    defaultAnnualLeaveAllowance: z.coerce.number().int().min(0).max(365),
    standardWorkWeekDays: z.coerce.number().int().min(1).max(7),
    standardWorkHoursPerDay: z.coerce.number().int().min(1).max(24),
    defaultProbationMonths: z.coerce.number().int().min(0).max(24),
  }).parse({
    defaultEmploymentType: formData.get("defaultEmploymentType"),
    defaultAnnualLeaveAllowance: formData.get("defaultAnnualLeaveAllowance"),
    standardWorkWeekDays: formData.get("standardWorkWeekDays"),
    standardWorkHoursPerDay: formData.get("standardWorkHoursPerDay"),
    defaultProbationMonths: formData.get("defaultProbationMonths"),
  })

  await settingsPrisma.employmentDefaults.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: {
      id: SETTINGS_ID,
      ...data,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: "update_employment_defaults",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: data,
  })

  revalidateSettingsPaths()
}

export async function updateSecurityAccessRules(formData: FormData) {
  const session = await requireSettingsAccess()

  const parsedAllowlist = String(formData.get("adminIpAllowlist") || "")
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)

  const data = z.object({
    allowSelfServiceRegistration: z.boolean(),
    allowedEmailDomain: z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
    employeeIdPrefix: z.string().trim().min(1).max(6).regex(/^[A-Za-z0-9]+$/),
    employeeIdDigits: z.number().int().min(2).max(8),
    passwordMinLength: z.number().int().min(8).max(64),
    autoAssignManagersFromOrgChart: z.boolean(),
    workflowFallbackReviewerRole: z.enum(["manager", "hr", "admin", "super_admin"]).nullable(),
    enforceAdminIpAllowlist: z.boolean(),
    adminIpAllowlist: z.string().max(5000).nullable(),
  }).superRefine((value, ctx) => {
    if (value.enforceAdminIpAllowlist && !value.adminIpAllowlist) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adminIpAllowlist"],
        message: "Add at least one admin IP before enabling the allowlist.",
      })
    }
  }).parse({
    allowSelfServiceRegistration: parseCheckbox(formData, "allowSelfServiceRegistration"),
    allowedEmailDomain: String(formData.get("allowedEmailDomain") || "").toLowerCase(),
    employeeIdPrefix: String(formData.get("employeeIdPrefix") || "").toUpperCase(),
    employeeIdDigits: Number(formData.get("employeeIdDigits") || "4"),
    passwordMinLength: Number(formData.get("passwordMinLength") || "8"),
    autoAssignManagersFromOrgChart: parseCheckbox(formData, "autoAssignManagersFromOrgChart"),
    workflowFallbackReviewerRole: (formData.get("workflowFallbackReviewerRole") || "hr") as UserRole,
    enforceAdminIpAllowlist: parseCheckbox(formData, "enforceAdminIpAllowlist"),
    adminIpAllowlist: parsedAllowlist.length > 0 ? parsedAllowlist.join("\n") : null,
  })

  await settingsPrisma.securityAccessRule.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: {
      id: SETTINGS_ID,
      ...data,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: "update_security_access_rules",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: {
      ...data,
      adminIpAllowlistCount: parsedAllowlist.length,
    },
  })

  revalidateSettingsPaths()
}

export async function seedDefaultOrganizationRoles() {
  const session = await requireSettingsAccess()

  await prisma.$transaction(async (tx) => {
    const existingCount = await tx.orgRole.count()
    if (existingCount > 0) {
      throw new Error("Organization roles already exist. Clear them manually before reseeding.")
    }

    for (const role of ORG_ROLE_RECORDS) {
      await tx.orgRole.create({
        data: {
          id: role.id,
          title: role.title,
          department: role.department,
          parentRoleId: role.parentRoleId,
          sortOrder: role.sortOrder,
          isActive: role.isActive,
        },
      })
    }
  })

  await logAudit({
    userId: session.user.id,
    action: "seed_org_roles",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: { count: ORG_ROLE_RECORDS.length },
  })

  revalidateSettingsPaths()
}

export async function createOrganizationRole(formData: FormData) {
  const session = await requireSettingsAccess()
  const data = z.object({
    title: z.string().trim().min(2).max(120),
    department: z.string().trim().min(2).max(120),
    parentRoleId: z.string().trim().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isActive: z.boolean(),
  }).parse({
    title: formData.get("title"),
    department: formData.get("department"),
    parentRoleId: formData.get("parentRoleId") || undefined,
    sortOrder: formData.get("sortOrder") || "0",
    isActive: parseCheckbox(formData, "isActive"),
  })

  await prisma.orgRole.create({
    data: {
      title: data.title,
      department: data.department,
      parentRoleId: data.parentRoleId || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: "create_org_role",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: data,
  })

  revalidateSettingsPaths()
}

export async function updateOrganizationRole(formData: FormData) {
  const session = await requireSettingsAccess()
  const data = z.object({
    roleId: z.string().min(1),
    title: z.string().trim().min(2).max(120),
    department: z.string().trim().min(2).max(120),
    parentRoleId: z.string().trim().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isActive: z.boolean(),
  }).parse({
    roleId: formData.get("roleId"),
    title: formData.get("title"),
    department: formData.get("department"),
    parentRoleId: formData.get("parentRoleId") || undefined,
    sortOrder: formData.get("sortOrder") || "0",
    isActive: parseCheckbox(formData, "isActive"),
  })

  const existing = await prisma.orgRole.findUnique({
    where: { id: data.roleId },
    select: { id: true, title: true, department: true },
  })
  if (!existing) {
    throw new Error("Role not found")
  }

  if (data.parentRoleId === data.roleId) {
    throw new Error("A role cannot be its own parent")
  }
  await assertNoOrgCycle(data.roleId, data.parentRoleId || null)

  await prisma.$transaction(async (tx) => {
    await tx.orgRole.update({
      where: { id: data.roleId },
      data: {
        title: data.title,
        department: data.department,
        parentRoleId: data.parentRoleId || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })

    if (existing.title !== data.title || existing.department !== data.department) {
      await tx.user.updateMany({
        where: {
          department: existing.department,
          position: existing.title,
        },
        data: {
          department: data.department,
          position: data.title,
        },
      })
    }
  })

  await logAudit({
    userId: session.user.id,
    action: "update_org_role",
    resource: "settings",
    resourceId: data.roleId,
    details: data,
  })

  revalidateSettingsPaths()
}

export async function deleteOrganizationRole(formData: FormData) {
  const session = await requireSettingsAccess()
  const roleId = z.string().min(1).parse(formData.get("roleId"))

  const role = await prisma.orgRole.findUnique({
    where: { id: roleId },
    select: { title: true, department: true },
  })
  if (!role) {
    throw new Error("Role not found")
  }

  const [childrenCount, assignedUsersCount] = await Promise.all([
    prisma.orgRole.count({ where: { parentRoleId: roleId } }),
    prisma.user.count({
      where: {
        status: { not: "exited" },
        position: role.title,
        department: role.department,
      },
    }),
  ])

  if (childrenCount > 0) {
    throw new Error("Delete child roles first or reassign them to another parent.")
  }
  if (assignedUsersCount > 0) {
    throw new Error("Reassign employees out of this role before deleting it.")
  }

  await prisma.orgRole.delete({ where: { id: roleId } })

  await logAudit({
    userId: session.user.id,
    action: "delete_org_role",
    resource: "settings",
    resourceId: roleId,
  })

  revalidateSettingsPaths()
}

export async function backfillLegacyAvatarUrls() {
  const session = await requireSettingsAccess()

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { image: "/api/profile/photo" },
        { image: { startsWith: "/uploads/avatars/" } },
      ],
    },
    select: { id: true },
  })

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: getUserAvatarUrl(user.id) },
    })
  }

  await logAudit({
    userId: session.user.id,
    action: "backfill_avatar_urls",
    resource: "settings",
    resourceId: SETTINGS_ID,
    details: { updatedUsers: users.length },
  })

  revalidateSettingsPaths()
}
