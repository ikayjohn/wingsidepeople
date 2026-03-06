import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function PUT() {
  const { error, session } = await requireAuth()
  if (error) return error

  await prisma.notification.updateMany({
    where: { userId: session!.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
