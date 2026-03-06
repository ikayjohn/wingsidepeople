export function isSameMonthDay(date: Date, reference: Date) {
  return date.getUTCMonth() === reference.getUTCMonth() && date.getUTCDate() === reference.getUTCDate()
}

export function nextBirthdayDate(birthday: Date, now: Date) {
  const year = now.getUTCFullYear()
  const candidate = new Date(Date.UTC(year, birthday.getUTCMonth(), birthday.getUTCDate()))
  if (candidate >= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
    return candidate
  }
  return new Date(Date.UTC(year + 1, birthday.getUTCMonth(), birthday.getUTCDate()))
}

export function daysUntil(date: Date, now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((target - start) / (24 * 60 * 60 * 1000))
}

export function yearsSince(startDate: Date, now: Date) {
  let years = now.getUTCFullYear() - startDate.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - startDate.getUTCMonth()
  const dayDiff = now.getUTCDate() - startDate.getUTCDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1
  return Math.max(0, years)
}
