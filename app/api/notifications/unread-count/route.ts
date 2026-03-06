import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const count = await prisma.notification.count({
      where: { userId: session!.user.id, read: false },
    })

    return NextResponse.json({ count })
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code === "P1001" || code === "ECONNREFUSED") {
      return NextResponse.json({ count: 0 })
    }

    throw error
  }
}
