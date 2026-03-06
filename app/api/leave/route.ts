import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createNotification } from "@/lib/notifications"

const leaveSchema = z.object({
  leaveType: z.enum(["annual", "sick", "compassionate", "unpaid", "other"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(2000).optional().nullable(),
})

function diffDaysInclusive(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999))

  const [user, requests, approvedThisYear] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { annualLeaveAllowance: true },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveRequest.aggregate({
      where: {
        userId: session!.user.id,
        status: "approved",
        startDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { days: true },
    }),
  ])

  const allowance = user?.annualLeaveAllowance ?? 20
  const used = approvedThisYear._sum.days ?? 0

  return NextResponse.json({
    leaveBalance: {
      allowance,
      used,
      remaining: Math.max(0, allowance - used),
    },
    requests,
  })
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const data = leaveSchema.parse(body)
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`)
    const endDate = new Date(`${data.endDate}T00:00:00.000Z`)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date values" }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date must be after or equal to start date" }, { status: 400 })
    }

    const days = diffDaysInclusive(startDate, endDate)
    if (days > 60) {
      return NextResponse.json({ error: "Leave request cannot exceed 60 days in one request" }, { status: 400 })
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: session!.user.id,
        leaveType: data.leaveType,
        startDate,
        endDate,
        days,
        reason: data.reason || null,
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
      reviewers.map((reviewer: { id: string }) =>
        createNotification({
          userId: reviewer.id,
          type: "leave_request",
          title: "New leave request",
          message: `${leave.user.name || leave.user.email} submitted a ${leave.leaveType} leave request.`,
          link: "/admin/leave-requests",
        })
      )
    )

    return NextResponse.json(leave, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
  }
}
