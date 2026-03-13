const STANDARD_WORKDAY_MINUTES = 8 * 60

export function calculateWorkedMinutes(checkInAt: Date, checkOutAt: Date | null) {
  if (!checkOutAt) return null
  const diff = Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60000)
  return Math.max(diff, 0)
}

export function calculateOvertimeMinutes(workedMinutes: number | null) {
  if (workedMinutes == null) return 0
  return Math.max(workedMinutes - STANDARD_WORKDAY_MINUTES, 0)
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes == null) return "0h 0m"
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${remainder}m`
}
