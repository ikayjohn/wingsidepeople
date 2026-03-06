export const USER_ROLES = ["employee", "manager", "hr", "admin", "super_admin"] as const
export type UserRole = (typeof USER_ROLES)[number]

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

export function canEditOtherProfiles(role: string | null | undefined) {
  return hasAnyRole(role, ["hr", "admin", "super_admin"])
}

export function canReviewRequests(role: string | null | undefined) {
  return hasAnyRole(role, ["manager", "hr", "admin", "super_admin"])
}
