import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { calculateChecklistStats, getSortedProgress } from "@/lib/onboarding-workflow"

const checklistInclude = Prisma.validator<Prisma.EmployeeChecklistInclude>()({
  user: { select: { id: true, name: true, email: true } },
  template: { select: { id: true, title: true } },
  progress: {
    include: {
      item: true,
    },
  },
})

type ChecklistWithRelations = Prisma.EmployeeChecklistGetPayload<{
  include: typeof checklistInclude
}>

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const checklists = await prisma.employeeChecklist.findMany({
    include: checklistInclude,
    orderBy: { assignedAt: "desc" },
  })

  const result = (checklists as ChecklistWithRelations[]).map((c) => {
    const stats = calculateChecklistStats(c)
    const currentStep = getSortedProgress(c.progress).find((item) => !item.completed)?.item ?? null
    return {
      id: c.id,
      user: c.user,
      template: c.template,
      assignedAt: c.assignedAt,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.percentage,
      currentStep,
    }
  })

  return NextResponse.json(result)
}
