import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(["holiday", "meeting", "birthday", "company_event"]),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const event = await prisma.event.update({
      where: { id },
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
      action: "update",
      resource: "event",
      resourceId: event.id,
      details: { title: event.title, category: event.category },
      ip,
    })

    return NextResponse.json(event)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  const { id } = await params
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, category: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  await prisma.event.delete({ where: { id } })

  await logAudit({
    userId: session!.user.id,
    action: "delete",
    resource: "event",
    resourceId: id,
    details: { title: existing.title, category: existing.category },
    ip,
  })

  return NextResponse.json({ success: true })
}
