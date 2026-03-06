import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ progressId: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { progressId } = await params

  const progress = await prisma.checklistProgress.findUnique({
    where: { id: progressId },
    include: {
      checklist: { select: { userId: true } },
    },
  })

  if (!progress) {
    return NextResponse.json({ error: "Progress item not found" }, { status: 404 })
  }

  if (progress.checklist.userId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.checklistProgress.update({
    where: { id: progressId },
    data: {
      completed: !progress.completed,
      completedAt: !progress.completed ? new Date() : null,
    },
  })

  return NextResponse.json(updated)
}
