import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { z } from "zod"

const rsvpSchema = z.object({
  status: z.enum(["attending", "maybe", "not_attending"]),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data = rsvpSchema.parse(body)

    const rsvp = await prisma.eventRsvp.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: session!.user.id,
        },
      },
      update: { status: data.status },
      create: {
        eventId: id,
        userId: session!.user.id,
        status: data.status,
      },
      select: { status: true, updatedAt: true },
    })

    return NextResponse.json(rsvp)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to save RSVP" }, { status: 500 })
  }
}
