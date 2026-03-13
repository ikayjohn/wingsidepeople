import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { calculateChecklistStats, decorateChecklistProgress, normalizeItemConfig } from "@/lib/onboarding-workflow"

const employeeChecklistInclude = Prisma.validator<Prisma.EmployeeChecklistInclude>()({
  template: {
    select: { id: true, title: true, department: true, position: true },
  },
  progress: {
    include: {
      item: true,
    },
    orderBy: { item: { order: "asc" } },
  },
})

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const checklists = await prisma.employeeChecklist.findMany({
    where: { userId: session!.user.id },
    include: employeeChecklistInclude,
    orderBy: { assignedAt: "desc" },
  })

  const serialized = checklists.map((checklist) => {
    const stats = calculateChecklistStats(checklist)

    return {
      ...checklist,
      ...stats,
      progress: decorateChecklistProgress(checklist).map((entry) => ({
        ...entry,
        item: {
          ...entry.item,
          config: normalizeItemConfig(entry.item.config),
        },
      })),
    }
  })

  return NextResponse.json(serialized)
}
