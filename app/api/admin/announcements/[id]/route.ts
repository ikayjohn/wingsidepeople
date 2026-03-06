import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(500_000).optional(),
  pinned: z.boolean().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    })

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    return NextResponse.json(announcement)
  } catch {
    return NextResponse.json({ error: "Failed to fetch announcement" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const body = await req.json()
    const data = updateAnnouncementSchema.parse(body)

    const announcement = await prisma.announcement.update({
      where: { id },
      data,
    })

    await logAudit({
      userId: session!.user.id,
      action: "update",
      resource: "announcement",
      resourceId: id,
      details: data,
      ip,
    })

    return NextResponse.json(announcement)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    await prisma.announcement.delete({
      where: { id }
    })

    await logAudit({
      userId: session!.user.id,
      action: "delete",
      resource: "announcement",
      resourceId: id,
      ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 })
  }
}
