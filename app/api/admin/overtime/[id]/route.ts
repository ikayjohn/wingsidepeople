import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRequestReviewer } from "@/lib/review-auth"
import { createNotification } from "@/lib/notifications"
import { hasAnyRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"

const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(2000).optional().nullable(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireRequestReviewer(req)
  if (error) return error

  const { id } = await params
  const existing = await prisma.overtimeRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, managerId: true } },
      lineManager: { select: { id: true, name: true, email: true } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Overtime request not found" }, { status: 404 })
  }

  const body = await req.json()
  const data = reviewSchema.parse(body)
  const isHrReviewer = hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])
  const isAssignedManager = existing.lineManagerId === session!.user.id

  if (existing.status === "pending_manager") {
    if (!isAssignedManager) {
      return NextResponse.json({ error: "Only the assigned line manager can review this request" }, { status: 403 })
    }

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: data.decision === "approved" ? "pending_hr" : "rejected",
        managerDecision: data.decision,
        managerNotes: data.notes || null,
        managerReviewedAt: new Date(),
      },
    })

    if (data.decision === "approved") {
      const hrReviewers = await prisma.user.findMany({
        where: { role: { in: ["hr", "admin", "super_admin"] } },
        select: { id: true },
        take: 50,
      })

      await Promise.all(
        hrReviewers.map((reviewer) =>
          createNotification({
            userId: reviewer.id,
            type: "overtime_request",
            title: "Overtime log awaiting HR confirmation",
            message: `${existing.user.name || existing.user.email} has an overtime log awaiting HR confirmation.`,
            link: "/admin/leave-requests",
          })
        )
      )

      await createNotification({
        userId: existing.user.id,
        type: "overtime_request",
        title: "Overtime log approved by line manager",
        message: "Your overtime log has moved to HR for confirmation.",
        link: "/leave",
      })
    } else {
      await createNotification({
        userId: existing.user.id,
        type: "overtime_request",
        title: "Overtime log rejected by line manager",
        message: "Your overtime log was rejected during line manager review.",
        link: "/leave",
      })
    }

    await logAudit({
      userId: session!.user.id,
      action: "review",
      resource: "overtime_request_manager",
      resourceId: updated.id,
      details: { decision: data.decision, employeeId: existing.user.id },
      ip,
    })

    return NextResponse.json(updated)
  }

  if (existing.status !== "pending_hr") {
    return NextResponse.json({ error: "This overtime request is not available for review" }, { status: 400 })
  }

  if (!isHrReviewer) {
    return NextResponse.json({ error: "Only HR reviewers can confirm this request" }, { status: 403 })
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: data.decision === "approved" ? "approved" : "rejected",
      hrDecision: data.decision,
      hrNotes: data.notes || null,
      hrReviewerId: session!.user.id,
      hrReviewedAt: new Date(),
    },
  })

  await createNotification({
    userId: existing.user.id,
    type: "overtime_request",
    title: `Overtime log ${data.decision === "approved" ? "confirmed" : "rejected"} by HR`,
    message: `Your overtime log for ${existing.workDate.toISOString().slice(0, 10)} was ${data.decision === "approved" ? "confirmed" : "rejected"} by HR.`,
    link: "/leave",
  })

  await logAudit({
    userId: session!.user.id,
    action: "review",
    resource: "overtime_request_hr",
    resourceId: updated.id,
    details: { decision: data.decision, employeeId: existing.user.id },
    ip,
  })

  return NextResponse.json(updated)
}
