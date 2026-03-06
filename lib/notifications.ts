import { prisma } from "@/lib/prisma"

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  link?: string
}) {
  return prisma.notification.create({
    data: params,
  })
}

export async function notifyAllEmployees(params: {
  type: string
  title: string
  message: string
  link?: string
}) {
  const users = await prisma.user.findMany({
    select: { id: true },
  })

  if (users.length === 0) return

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    })),
  })
}
