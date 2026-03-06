import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const searchParams = req.nextUrl.searchParams
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  const where: Record<string, unknown> = {}
  if (start && end) {
    where.startDate = {
      gte: new Date(start),
      lte: new Date(end),
    }
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      rsvps: {
        where: { userId: session!.user.id },
        select: { status: true, updatedAt: true },
        take: 1,
      },
    },
    orderBy: { startDate: "asc" },
  })

  return NextResponse.json(
    events.map(({ rsvps, ...event }) => ({
      ...event,
      myRsvp: rsvps[0] || null,
    }))
  )
}
