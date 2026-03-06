import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const updateHandbookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  content: z.string().min(1).max(500_000).optional(),
  order: z.number().int().min(0).max(10000).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const section = await prisma.handbookSection.findUnique({
      where: { id }
    })

    if (!section) {
      return NextResponse.json({ error: "Handbook section not found" }, { status: 404 })
    }

    return NextResponse.json(section)
  } catch {
    return NextResponse.json({ error: "Failed to fetch handbook section" }, { status: 500 })
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
    const data = updateHandbookSchema.parse(body)

    if (data.slug) {
      const existing = await prisma.handbookSection.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      })

      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "A section with this slug already exists" }, { status: 409 })
      }
    }

    const section = await prisma.handbookSection.update({
      where: { id },
      data,
    })

    await logAudit({
      userId: session!.user.id,
      action: "update",
      resource: "handbook_section",
      resourceId: id,
      details: data,
      ip,
    })

    return NextResponse.json(section)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update handbook section" }, { status: 500 })
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
    await prisma.handbookSection.delete({
      where: { id }
    })

    await logAudit({
      userId: session!.user.id,
      action: "delete",
      resource: "handbook_section",
      resourceId: id,
      ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete handbook section" }, { status: 500 })
  }
}
