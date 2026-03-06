import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { notifyAllEmployees } from "@/lib/notifications"
import { logAudit } from "@/lib/audit"

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(500_000),
  pinned: z.boolean().optional().default(false),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [
        { pinned: 'desc' },
        { publishedAt: 'desc' }
      ]
    })
    return NextResponse.json(announcements)
  } catch {
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = announcementSchema.parse(body)

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        pinned: data.pinned,
      }
    })

    notifyAllEmployees({
      type: "announcement",
      title: "New Announcement",
      message: data.title,
      link: `/announcements/${announcement.id}`,
    }).catch(() => {})

    await logAudit({
      userId: session!.user.id,
      action: "create",
      resource: "announcement",
      resourceId: announcement.id,
      details: { title: announcement.title, pinned: announcement.pinned },
      ip,
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
  }
}
