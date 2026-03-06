export type ProfileSnapshot = {
  employeeId: string | null
  gender: string | null
  phone: string | null
  address: string | null
  department: string | null
  position: string | null
  employmentType: string | null
  workLocation: string | null
  employmentStartDate: Date | null
  emergencyContact: string | null
  emergencyPhone: string | null
  birthday: Date | null
}

export const REQUIRED_PROFILE_FIELDS: Array<{ label: string; key: keyof ProfileSnapshot }> = [
  { label: "employee ID", key: "employeeId" },
  { label: "gender", key: "gender" },
  { label: "phone", key: "phone" },
  { label: "address", key: "address" },
  { label: "department", key: "department" },
  { label: "position", key: "position" },
  { label: "employment type", key: "employmentType" },
  { label: "work location", key: "workLocation" },
  { label: "employment start date", key: "employmentStartDate" },
  { label: "emergency contact", key: "emergencyContact" },
  { label: "emergency phone", key: "emergencyPhone" },
  { label: "birthday", key: "birthday" },
]

export function hasProfileValue(value: string | Date | null | undefined) {
  if (!value) return false
  if (value instanceof Date) return true
  return value.trim().length > 0
}

export function getMissingProfileFields(profile: ProfileSnapshot | null) {
  if (!profile) return REQUIRED_PROFILE_FIELDS.map((item) => item.label)

  return REQUIRED_PROFILE_FIELDS
    .filter((item) => !hasProfileValue(profile[item.key]))
    .map((item) => item.label)
}

export function getProfileCompletionPercent(profile: ProfileSnapshot | null) {
  if (!profile) return 0
  const completed = REQUIRED_PROFILE_FIELDS.filter((item) => hasProfileValue(profile[item.key])).length
  return Math.round((completed / REQUIRED_PROFILE_FIELDS.length) * 100)
}
