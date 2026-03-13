import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createNotification } from "@/lib/notifications"
import { normalizeUserImage } from "@/lib/avatar"

const wishSchema = z.object({
  message: z.string().min(2).max(280),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { userId } = await params
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, showBirthdayPublicly: true },
  })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!target.showBirthdayPublicly && target.id !== session!.user.id) {
    return NextResponse.json({ error: "Birthday wishes are private for this employee" }, { status: 403 })
  }

  const wishes = await prisma.birthdayWish.findMany({
    where: { toUserId: userId },
    include: {
      fromUser: {
        select: { id: true, name: true, preferredName: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json(
    wishes.map((wish) => ({
      ...wish,
      fromUser: {
        ...wish.fromUser,
        image: normalizeUserImage(wish.fromUser.image, wish.fromUser.id),
      },
    }))
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { userId } = await params
  if (userId === session!.user.id) {
    return NextResponse.json({ error: "You cannot send a birthday wish to yourself" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, showBirthdayPublicly: true, name: true, email: true },
  })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!target.showBirthdayPublicly) {
    return NextResponse.json({ error: "Birthday wishes are private for this employee" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = wishSchema.parse(body)

    const wish = await prisma.birthdayWish.create({
      data: {
        toUserId: userId,
        fromUserId: session!.user.id,
        message: data.message,
      },
      include: {
        fromUser: { select: { id: true, name: true, preferredName: true, image: true } },
      },
    })

    await createNotification({
      userId: userId,
      type: "birthday_wish",
      title: "You got a birthday wish",
      message: `${wish.fromUser.preferredName || wish.fromUser.name || "A colleague"} sent you a birthday wish.`,
      link: "/recognition",
    })

    return NextResponse.json(
      {
        ...wish,
        fromUser: {
          ...wish.fromUser,
          image: normalizeUserImage(wish.fromUser.image, wish.fromUser.id),
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to send birthday wish" }, { status: 500 })
  }
}
