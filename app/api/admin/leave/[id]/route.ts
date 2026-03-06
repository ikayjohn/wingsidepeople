import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRequestReviewer } from "@/lib/review-auth"
import { createNotification } from "@/lib/notifications"
import { hasAnyRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().max(2000).optional().nullable(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireRequestReviewer(req)
  if (error) return error

  const { id } = await params
  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, managerId: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  }

  const isManagerOnly = hasAnyRole(session!.user.role, ["manager"]) && !hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])
  if (isManagerOnly && existing.user.managerId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be reviewed" }, { status: 400 })
  }

  try {
    const body = await req.json()
    const data = reviewSchema.parse(body)

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes || null,
        reviewedById: session!.user.id,
        reviewedAt: new Date(),
      },
    })

    await createNotification({
      userId: existing.user.id,
      type: "leave_request",
      title: `Leave request ${data.status}`,
      message: `Your ${existing.leaveType} leave request (${existing.days} day${existing.days > 1 ? "s" : ""}) was ${data.status}.`,
      link: "/leave",
    })

    await logAudit({
      userId: session!.user.id,
      action: "review",
      resource: "leave_request",
      resourceId: updated.id,
      details: { status: updated.status, leaveType: updated.leaveType, employeeId: existing.user.id },
      ip,
    })

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to review leave request" }, { status: 500 })
  }
}
