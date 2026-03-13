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
      lineManager: { select: { id: true, name: true, email: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  }

  const isManagerOnly = hasAnyRole(session!.user.role, ["manager"]) && !hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])
  if (isManagerOnly && existing.lineManager?.id !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = reviewSchema.parse(body)

    const actingAsManager =
      existing.status === "pending_manager" &&
      (isManagerOnly || existing.lineManager?.id === session!.user.id)
    const actingAsHr =
      existing.status === "pending_hr" &&
      hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])

    if (!actingAsManager && !actingAsHr) {
      return NextResponse.json({ error: "This leave request is not available for your review stage." }, { status: 400 })
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: actingAsManager
        ? {
            status: data.status === "approved" ? "pending_hr" : "rejected",
            managerDecision: data.status,
            managerNotes: data.reviewNotes || null,
            managerReviewedAt: new Date(),
            reviewNotes: data.status === "rejected" ? data.reviewNotes || null : existing.reviewNotes,
          }
        : {
            status: data.status,
            hrDecision: data.status,
            reviewNotes: data.reviewNotes || null,
            reviewedById: session!.user.id,
            reviewedAt: new Date(),
          },
    })

    if (actingAsManager && data.status === "approved") {
      const hrReviewers = await prisma.user.findMany({
        where: { role: { in: ["hr", "admin", "super_admin"] } },
        select: { id: true },
        take: 50,
      })

      await Promise.all(
        hrReviewers.map((reviewer) =>
          createNotification({
            userId: reviewer.id,
            type: "leave_request",
            title: "Leave request awaiting HR approval",
            message: `${existing.user.name || existing.user.email} has a leave request awaiting HR approval.`,
            link: "/admin/leave-requests",
          })
        )
      )
    }

    await createNotification({
      userId: existing.user.id,
      type: "leave_request",
      title: actingAsManager && data.status === "approved" ? "Leave request approved by manager" : `Leave request ${data.status}`,
      message:
        actingAsManager && data.status === "approved"
          ? `Your ${existing.leaveType} leave request (${existing.days} day${existing.days > 1 ? "s" : ""}) was approved by your manager and is awaiting HR confirmation.`
          : `Your ${existing.leaveType} leave request (${existing.days} day${existing.days > 1 ? "s" : ""}) was ${data.status}.`,
      link: "/leave",
    })

    await logAudit({
      userId: session!.user.id,
      action: "review",
      resource: "leave_request",
      resourceId: updated.id,
      details: { status: updated.status, leaveType: updated.leaveType, employeeId: existing.user.id, stage: actingAsManager ? "manager" : "hr" },
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
