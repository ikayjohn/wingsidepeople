import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const checklists = await prisma.employeeChecklist.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, title: true } },
      progress: true,
    },
    orderBy: { assignedAt: "desc" },
  })

  const result = checklists.map((c) => {
    const total = c.progress.length
    const completed = c.progress.filter((p) => p.completed).length
    return {
      id: c.id,
      user: c.user,
      template: c.template,
      assignedAt: c.assignedAt,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  return NextResponse.json(result)
}
