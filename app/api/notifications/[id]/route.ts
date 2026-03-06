import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  await prisma.notification.updateMany({
    where: { id, userId: session!.user.id },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
