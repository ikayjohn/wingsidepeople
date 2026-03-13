import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestReviewer } from "@/lib/review-auth"
import { hasAnyRole } from "@/lib/rbac"

export async function GET(req: Request) {
  const { error, session } = await requireRequestReviewer()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")?.trim()

  const isManagerOnly = hasAnyRole(session!.user.role, ["manager"]) && !hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(isManagerOnly ? { lineManagerId: session!.user.id, status: "pending_manager" } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, department: true, position: true, managerId: true } },
      lineManager: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
  })

  return NextResponse.json(
    leaveRequests.map((item) => ({
      ...item,
      reviewStage:
        item.status === "pending_manager"
          ? "manager"
          : item.status === "pending_hr"
            ? "hr"
            : null,
    }))
  )
}
