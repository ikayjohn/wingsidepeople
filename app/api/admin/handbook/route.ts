import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const handbookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  content: z.string().min(1, "Content is required").max(500_000),
  order: z.number().int().min(0).max(10000),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const sections = await prisma.handbookSection.findMany({
      orderBy: { order: 'asc' }
    })
    return NextResponse.json(sections)
  } catch {
    return NextResponse.json({ error: "Failed to fetch handbook sections" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = handbookSchema.parse(body)

    const existing = await prisma.handbookSection.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json({ error: "A section with this slug already exists" }, { status: 409 })
    }

    const section = await prisma.handbookSection.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        order: data.order,
      }
    })

    await logAudit({
      userId: session!.user.id,
      action: "create",
      resource: "handbook_section",
      resourceId: section.id,
      details: { title: section.title, slug: section.slug, order: section.order },
      ip,
    })

    return NextResponse.json(section, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create handbook section" }, { status: 500 })
  }
}
