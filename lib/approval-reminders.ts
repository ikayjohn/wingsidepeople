import { prisma } from "@/lib/prisma"

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(from: Date, to: Date) {
  const diffMs = Math.max(0, to.getTime() - from.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export async function sendPendingApprovalReminders() {
  const now = new Date()
  const thresholdDate = new Date(now)
  thresholdDate.setDate(thresholdDate.getDate() - 3)

  const pending = await prisma.user.findMany({
    where: {
      status: "pending_approval",
      role: { notIn: ["admin", "super_admin"] },
      createdAt: { lte: thresholdDate },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  if (!pending.length) {
    return { sent: 0, pendingCount: 0, adminCount: 0, oldestPendingDays: 0 }
  }

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["admin", "super_admin"] },
      status: "active",
    },
    select: { id: true },
  })

  if (!admins.length) {
    return { sent: 0, pendingCount: pending.length, adminCount: 0, oldestPendingDays: 0 }
  }

  const oldestPendingDays = daysBetween(pending[0].createdAt, now)
  const todayStart = startOfDay(now)

  const existingToday = await prisma.notification.findMany({
    where: {
      type: "admin_approval_queue",
      createdAt: { gte: todayStart },
      userId: { in: admins.map((a) => a.id) },
    },
    select: { userId: true },
  })
  const alreadySentUsers = new Set(existingToday.map((n) => n.userId))

  const payload = admins
    .filter((admin) => !alreadySentUsers.has(admin.id))
    .map((admin) => ({
      userId: admin.id,
      type: "admin_approval_queue",
      title: "Pending approvals need review",
      message: `${pending.length} signup request(s) have waited 3+ days. Oldest pending: ${oldestPendingDays} day(s).`,
      link: "/admin/employees",
    }))

  if (payload.length) {
    await prisma.notification.createMany({ data: payload })
  }

  return {
    sent: payload.length,
    pendingCount: pending.length,
    adminCount: admins.length,
    oldestPendingDays,
  }
}
