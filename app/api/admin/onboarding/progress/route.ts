import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

type ChecklistProgressItem = {
  completed: boolean
}

type ChecklistWithRelations = {
  id: string
  assignedAt: Date
  user: { id: string; name: string | null; email: string }
  template: { id: string; title: string }
  progress: ChecklistProgressItem[]
}

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

  const result = (checklists as ChecklistWithRelations[]).map((c: ChecklistWithRelations) => {
    const total = c.progress.length
    const completed = c.progress.filter((p: ChecklistProgressItem) => p.completed).length
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
