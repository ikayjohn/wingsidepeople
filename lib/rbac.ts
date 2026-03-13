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
  | "recruitment"
  | "assets"
  | "attendance"
  | "performance"
  | "academy"
  | "surveys"
  | "disciplinary"
  | "offboarding"
  | "analytics"

export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return "employee"
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "employee"
}

export function hasAnyRole(role: string | null | undefined, allowedRoles: UserRole[]) {
  const normalized = normalizeRole(role)
  return allowedRoles.includes(normalized)
}

export function canAccessAdminArea(role: string | null | undefined) {
  return hasAnyRole(role, ["manager", "hr", "admin", "super_admin"])
}

const ALL_SECTIONS: AdminSection[] = [
  "dashboard",
  "approvals",
  "announcements",
  "handbook",
  "policies",
  "documents",
  "onboarding",
  "events",
  "leave_requests",
  "recruitment",
  "assets",
  "attendance",
  "performance",
  "academy",
  "surveys",
  "disciplinary",
  "offboarding",
  "analytics",
]

export function canAccessAdminSection(
  role: string | null | undefined,
  section: AdminSection
) {
  const normalized = normalizeRole(role)
  const byRole: Record<UserRole, AdminSection[]> = {
    employee: [],
    manager: [
      "dashboard",
      "approvals",
      "leave_requests",
      "attendance",
      "performance",
      "disciplinary",
    ],
    hr: ALL_SECTIONS,
    admin: ALL_SECTIONS,
    super_admin: ALL_SECTIONS,
  }
  return byRole[normalized].includes(section)
}

export function canEditOtherProfiles(role: string | null | undefined) {
  return hasAnyRole(role, ["hr", "admin", "super_admin"])
}

export function canReviewRequests(role: string | null | undefined) {
  return hasAnyRole(role, ["manager", "hr", "admin", "super_admin"])
}
