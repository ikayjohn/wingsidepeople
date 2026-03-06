import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const checklists = await prisma.employeeChecklist.findMany({
    where: { userId: session!.user.id },
    include: {
      template: {
        select: { id: true, title: true },
      },
      progress: {
        include: {
          item: {
            select: { id: true, title: true, description: true, order: true },
          },
        },
        orderBy: { item: { order: "asc" } },
      },
    },
    orderBy: { assignedAt: "desc" },
  })

  return NextResponse.json(checklists)
}
