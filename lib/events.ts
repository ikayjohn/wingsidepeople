import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

const DAY_MS = 24 * 60 * 60 * 1000

export async function sendUpcomingEventReminders() {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + DAY_MS)

  const events = await prisma.event.findMany({
    where: {
      startDate: {
        gte: now,
        lte: tomorrow,
      },
    },
    select: {
      id: true,
      title: true,
      startDate: true,
    },
  })

  if (!events.length) return { sent: 0 }

  let sent = 0
  const users = await prisma.user.findMany({ select: { id: true } })

  for (const event of events) {
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "event_reminder",
          link: `/calendar?event=${event.id}`,
          createdAt: { gte: now },
        },
        select: { id: true },
      })

      if (existing) continue

      await createNotification({
        userId: user.id,
        type: "event_reminder",
        title: "Upcoming Event",
        message: `${event.title} starts on ${event.startDate.toLocaleDateString()}`,
        link: `/calendar?event=${event.id}`,
      })
      sent += 1
    }
  }

  return { sent }
}

