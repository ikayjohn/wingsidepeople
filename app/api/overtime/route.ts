import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createNotification } from "@/lib/notifications"

const overtimeSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.coerce.number().int().min(30).max(16 * 60),
  reason: z.string().max(2000).optional().nullable(),
})

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const requests = await prisma.overtimeRequest.findMany({
    where: { userId: session!.user.id },
    include: {
      lineManager: { select: { id: true, name: true, email: true } },
      hrReviewer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const data = overtimeSchema.parse(body)
    const workDate = new Date(`${data.workDate}T00:00:00.000Z`)

    if (Number.isNaN(workDate.getTime())) {
      return NextResponse.json({ error: "Invalid work date" }, { status: 400 })
    }

    const employee = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        managerId: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    })

    if (!employee?.managerId || !employee.manager) {
      return NextResponse.json({ error: "You need an assigned line manager before logging overtime." }, { status: 400 })
    }

    const request = await prisma.overtimeRequest.create({
      data: {
        userId: employee.id,
        lineManagerId: employee.managerId,
        workDate,
        minutes: data.minutes,
        reason: data.reason || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        lineManager: { select: { id: true, name: true, email: true } },
      },
    })

    await createNotification({
      userId: employee.manager.id,
      type: "overtime_request",
      title: "New overtime log awaiting approval",
      message: `${request.user.name || request.user.email} logged ${request.minutes} overtime minutes for ${data.workDate}.`,
      link: "/admin/leave-requests",
    })

    return NextResponse.json(request, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create overtime request" }, { status: 500 })
  }
}
