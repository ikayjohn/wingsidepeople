export function calculateProgressPercentage(currentValue: number | null, targetValue: number | null) {
  if (currentValue == null || targetValue == null || targetValue === 0) return 0
  const raw = Math.round((currentValue / targetValue) * 100)
  return Math.max(0, Math.min(raw, 100))
}

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number")
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

export function groupAverageByKey<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  const groups = new Map<string, { total: number; count: number }>()

  for (const item of items) {
    const key = getKey(item)
    const current = groups.get(key) ?? { total: 0, count: 0 }
    current.total += getValue(item)
    current.count += 1
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    average: value.count ? value.total / value.count : 0,
    count: value.count,
  }))
}
