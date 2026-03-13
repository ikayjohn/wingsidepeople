import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createNotification } from "@/lib/notifications"
import { normalizeUserImage } from "@/lib/avatar"

const recognitionSchema = z.object({
  toUserId: z.string().min(1),
  category: z.enum(["teamwork", "leadership", "innovation", "customer_impact", "milestone", "other"]),
  title: z.string().min(3).max(120),
  message: z.string().min(5).max(1000),
  isPublic: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const mine = searchParams.get("mine") === "1"

  const recognitions = await prisma.recognition.findMany({
    where: mine
      ? {
          OR: [{ fromUserId: session!.user.id }, { toUserId: session!.user.id }],
        }
      : {
          isPublic: true,
        },
    include: {
      fromUser: { select: { id: true, name: true, preferredName: true, image: true } },
      toUser: { select: { id: true, name: true, preferredName: true, image: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(
    recognitions.map((recognition) => ({
      ...recognition,
      fromUser: {
        ...recognition.fromUser,
        image: normalizeUserImage(recognition.fromUser.image, recognition.fromUser.id),
      },
      toUser: {
        ...recognition.toUser,
        image: normalizeUserImage(recognition.toUser.image, recognition.toUser.id),
      },
    }))
  )
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const data = recognitionSchema.parse(body)

    if (data.toUserId === session!.user.id) {
      return NextResponse.json({ error: "You cannot recognize yourself" }, { status: 400 })
    }

    const recipient = await prisma.user.findUnique({
      where: { id: data.toUserId },
      select: { id: true, name: true, email: true },
    })
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    const recognition = await prisma.recognition.create({
      data: {
        fromUserId: session!.user.id,
        toUserId: data.toUserId,
        category: data.category,
        title: data.title,
        message: data.message,
        isPublic: data.isPublic,
      },
      include: {
        fromUser: { select: { id: true, name: true, preferredName: true, image: true } },
        toUser: { select: { id: true, name: true, preferredName: true, image: true, department: true } },
      },
    })

    await createNotification({
      userId: recipient.id,
      type: "recognition",
      title: "You were recognized",
      message: `${recognition.fromUser.preferredName || recognition.fromUser.name || "A colleague"} recognized you: ${recognition.title}`,
      link: "/recognition",
    })

    return NextResponse.json(
      {
        ...recognition,
        fromUser: {
          ...recognition.fromUser,
          image: normalizeUserImage(recognition.fromUser.image, recognition.fromUser.id),
        },
        toUser: {
          ...recognition.toUser,
          image: normalizeUserImage(recognition.toUser.image, recognition.toUser.id),
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create recognition" }, { status: 500 })
  }
}
