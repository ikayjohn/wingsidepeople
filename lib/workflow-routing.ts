import { prisma } from "@/lib/prisma"
import { getSecurityAccessRules } from "@/lib/admin-settings"
import { getOrgRoles } from "@/lib/org-structure-data"
import { getRecommendedManagerIdsForRole } from "@/lib/org-structure"
import { normalizeRole, type UserRole } from "@/lib/rbac"

export async function getEmployeeRoutingProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      position: true,
      managerId: true,
      manager: { select: { id: true, name: true, email: true } },
    },
  })
}

async function findFallbackReviewer(role: UserRole | null | undefined) {
  const normalizedRole = role ? normalizeRole(role) : null
  if (!normalizedRole || normalizedRole === "employee") {
    return null
  }

  return prisma.user.findFirst({
    where: {
      role: normalizedRole,
      status: "active",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: [{ name: "asc" }],
  })
}

export async function resolveManagerAssignment(params: {
  userId?: string
  department: string | null | undefined
  position: string | null | undefined
  managerId?: string | null
}) {
  const { department, position } = params
  if (!department || !position) {
    return null
  }

  if (params.managerId) {
    return params.managerId
  }

  const settings = await getSecurityAccessRules()
  if (!settings.autoAssignManagersFromOrgChart) {
    return null
  }

  const [roles, users] = await Promise.all([
    getOrgRoles(),
    prisma.user.findMany({
      where: { status: "active" },
      select: { id: true, department: true, position: true, status: true },
    }),
  ])

  const recommendedManagerIds = getRecommendedManagerIdsForRole(roles, users, department, position)
  const candidateId = recommendedManagerIds.find((id) => id !== params.userId)
  return candidateId || null
}

export async function ensureEmployeeHasManager(userId: string, workflowLabel: string) {
  let employee = await getEmployeeRoutingProfile(userId)

  if (!employee) {
    return {
      error: `Unable to find employee record for ${workflowLabel}.`,
      employee: null,
      usedFallback: false,
      autoAssigned: false,
    }
  }

  let autoAssigned = false
  let usedFallback = false

  if (!employee.managerId) {
    const recommendedManagerId = await resolveManagerAssignment({
      userId: employee.id,
      department: employee.department,
      position: employee.position,
      managerId: employee.managerId,
    })

    if (recommendedManagerId) {
      await prisma.user.update({
        where: { id: employee.id },
        data: { managerId: recommendedManagerId },
      })
      employee = await getEmployeeRoutingProfile(userId)
      autoAssigned = true
    }
  }

  if (!employee?.managerId || !employee.manager) {
    const settings = await getSecurityAccessRules()
    const fallbackReviewer = await findFallbackReviewer(
      settings.workflowFallbackReviewerRole as UserRole | null | undefined
    )

    if (fallbackReviewer) {
      return {
        employee: {
          ...employee,
          managerId: fallbackReviewer.id,
          manager: fallbackReviewer,
        },
        usedFallback: true,
        autoAssigned,
      }
    }

    return {
      error: `You need an assigned line manager before submitting ${workflowLabel}.`,
      employee,
      usedFallback,
      autoAssigned,
    }
  }

  return { employee, usedFallback, autoAssigned }
}
