import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { id: true, title: true },
  })
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 })
  }

  const acknowledgments = await prisma.policyAcknowledgment.findMany({
    where: { policyId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { acknowledgedAt: "desc" },
  })

  const totalEmployees = await prisma.user.count({ where: { role: "employee" } })

  return NextResponse.json({
    policy,
    acknowledgments,
    totalEmployees,
    acknowledgedCount: acknowledgments.length,
  })
}
