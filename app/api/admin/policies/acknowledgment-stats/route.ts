import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const policies = await prisma.policy.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      _count: {
        select: { acknowledgments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const totalEmployees = await prisma.user.count({ where: { role: "employee" } })

  const stats = policies.map((p: { id: string; title: string; category: string; _count: { acknowledgments: number } }) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    acknowledgedCount: p._count.acknowledgments,
    totalEmployees,
    percentage: totalEmployees > 0
      ? Math.round((p._count.acknowledgments / totalEmployees) * 100)
      : 0,
  }))

  return NextResponse.json({ stats })
}
