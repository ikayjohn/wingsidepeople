import { prisma } from "@/lib/prisma"

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(req?: Request | null) {
  if (!req) return null
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  const realIp = req.headers.get("x-real-ip")
  return realIp?.trim() || null
}

export function isIpAllowed(ip: string | null, allowlistRaw: string | undefined) {
  if (!allowlistRaw || !allowlistRaw.trim()) return true
  if (!ip) return false

  const allowlist = allowlistRaw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)

  return allowlist.includes(ip)
}

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

export function getRateLimitRetryAfter(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
}

export async function checkRateLimitPersistent(params: {
  scope: string
  key: string
  max: number
  windowMs: number
  ip?: string | null
}) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - params.windowMs)

  const [count, oldest] = await Promise.all([
    prisma.auditLog.count({
      where: {
        resource: "rate_limit",
        action: params.scope,
        resourceId: params.key,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        resource: "rate_limit",
        action: params.scope,
        resourceId: params.key,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ])

  if (count >= params.max) {
    const resetAt = (oldest?.createdAt?.getTime() || now.getTime()) + params.windowMs
    return { allowed: false, remaining: 0, resetAt }
  }

  await prisma.auditLog.create({
    data: {
      action: params.scope,
      resource: "rate_limit",
      resourceId: params.key,
      ip: params.ip || null,
    },
  })

  const remaining = Math.max(0, params.max - (count + 1))
  return { allowed: true, remaining, resetAt: now.getTime() + params.windowMs }
}
