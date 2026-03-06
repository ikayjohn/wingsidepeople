import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createNotification } from "@/lib/notifications"

const requestSchema = z.object({
  type: z.enum(["hr", "report", "it", "finance", "other"]),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
})

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const requests = await prisma.hRRequest.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const data = requestSchema.parse(body)

    const request = await prisma.hRRequest.create({
      data: {
        userId: session!.user.id,
        type: data.type,
        title: data.title,
        description: data.description,
        priority: data.priority,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    const reviewers = await prisma.user.findMany({
      where: { role: { in: ["hr", "admin", "super_admin"] } },
      select: { id: true },
      take: 50,
    })
    await Promise.all(
      reviewers.map((reviewer) =>
        createNotification({
          userId: reviewer.id,
          type: "hr_request",
          title: "New employee request",
          message: `${request.user.name || request.user.email} submitted a ${request.type} request.`,
          link: "/admin/leave-requests",
        })
      )
    )

    return NextResponse.json(request, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }
}
