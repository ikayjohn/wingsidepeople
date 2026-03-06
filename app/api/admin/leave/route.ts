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
      ...(isManagerOnly ? { user: { managerId: session!.user.id } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, department: true, position: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
  })

  return NextResponse.json(leaveRequests)
}
