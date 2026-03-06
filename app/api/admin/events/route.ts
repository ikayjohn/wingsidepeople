import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(["holiday", "meeting", "birthday", "company_event"]),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
  })

  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = eventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay ?? true,
      },
    })

    await logAudit({
      userId: session!.user.id,
      action: "create",
      resource: "event",
      resourceId: event.id,
      details: { title: event.title, category: event.category },
      ip,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
