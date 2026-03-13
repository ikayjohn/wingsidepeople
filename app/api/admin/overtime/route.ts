import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestReviewer } from "@/lib/review-auth"
import { hasAnyRole } from "@/lib/rbac"

export async function GET(req: Request) {
  const { error, session } = await requireRequestReviewer(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")?.trim()
  const isManagerOnly = hasAnyRole(session!.user.role, ["manager"]) && !hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])
  const isHrReviewer = hasAnyRole(session!.user.role, ["hr", "admin", "super_admin"])

  const requests = await prisma.overtimeRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(isManagerOnly ? { lineManagerId: session!.user.id } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, department: true, position: true, managerId: true } },
      lineManager: { select: { id: true, name: true, email: true } },
      hrReviewer: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  })

  return NextResponse.json(
    requests.map((request) => ({
      ...request,
      reviewStage:
        request.status === "pending_manager" && request.lineManagerId === session!.user.id
          ? "manager"
          : request.status === "pending_hr" && isHrReviewer
            ? "hr"
            : null,
    }))
  )
}
