import { prisma } from "@/lib/prisma"
import { isSameMonthDay } from "@/lib/birthday-utils"

export async function sendDailyBirthdayNotifications() {
  const now = new Date()
  const celebrants = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      showBirthdayPublicly: true,
      status: { not: "exited" },
    },
    select: { id: true, name: true, preferredName: true, birthday: true },
  })

  const todaysCelebrants = celebrants.filter((u) => isSameMonthDay(u.birthday!, now))
  if (!todaysCelebrants.length) return { sent: 0, celebrants: 0 }

  const users = await prisma.user.findMany({
    where: { status: { not: "exited" } },
    select: { id: true },
  })

  const payload = users.flatMap((user) =>
    todaysCelebrants.map((celebrant) => ({
      userId: user.id,
      type: "birthday",
      title: "Birthday today",
      message: `${celebrant.preferredName || celebrant.name || "A teammate"} is celebrating a birthday today.`,
      link: "/recognition",
    }))
  )
  if (payload.length) {
    await prisma.notification.createMany({ data: payload })
  }

  return { sent: payload.length, celebrants: todaysCelebrants.length }
}
