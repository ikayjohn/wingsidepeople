export const USER_ROLES = ["employee", "manager", "hr", "admin", "super_admin"] as const
export type UserRole = (typeof USER_ROLES)[number]
export type AdminSection =
  | "dashboard"
  | "approvals"
  | "announcements"
  | "handbook"
  | "policies"
  | "documents"
  | "onboarding"
  | "events"
  | "leave_requests"

export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return "employee"
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "employee"
}

export function hasAnyRole(role: string | null | undefined, allowedRoles: UserRole[]) {
  const normalized = normalizeRole(role)
  return allowedRoles.includes(normalized)
}

export function canAccessAdminArea(role: string | null | undefined) {
  return hasAnyRole(role, ["admin", "super_admin"])
}

export function canAccessAdminSection(
  role: string | null | undefined,
  section: AdminSection
) {
  const normalized = normalizeRole(role)
  const byRole: Record<UserRole, AdminSection[]> = {
    employee: [],
    manager: [],
    hr: [],
    admin: [
      "dashboard",
      "approvals",
      "announcements",
      "handbook",
      "policies",
      "documents",
      "onboarding",
      "events",
      "leave_requests",
    ],
    super_admin: [
      "dashboard",
      "approvals",
      "announcements",
      "handbook",
      "policies",
      "documents",
      "onboarding",
      "events",
      "leave_requests",
    ],
  }
  return byRole[normalized].includes(section)
}

export function canEditOtherProfiles(role: string | null | undefined) {
  return hasAnyRole(role, ["hr", "admin", "super_admin"])
}

export function canReviewRequests(role: string | null | undefined) {
  return hasAnyRole(role, ["manager", "hr", "admin", "super_admin"])
}
