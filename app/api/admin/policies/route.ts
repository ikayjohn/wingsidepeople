import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { notifyAllEmployees } from "@/lib/notifications"
import { logAudit } from "@/lib/audit"

const VALID_CATEGORIES = ["hr", "it", "operations", "finance", "legal", "workplace", "other"] as const

const policySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  category: z.enum(VALID_CATEGORIES),
  status: z.enum(["draft", "in_review", "published"]).optional().default("published"),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(1, "Content is required").max(500_000),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD").optional().nullable(),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Last reviewed date must be YYYY-MM-DD").optional().nullable(),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const policies = await prisma.policy.findMany({
      orderBy: [
        { category: 'asc' },
        { title: 'asc' }
      ]
    })
    return NextResponse.json(policies)
  } catch {
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, session, ip } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = policySchema.parse(body)

    const existing = await prisma.policy.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json({ error: "A policy with this slug already exists" }, { status: 409 })
    }

    const policy = await prisma.policy.create({
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        status: data.status,
        summary: data.summary || null,
        content: data.content,
        effectiveDate: data.effectiveDate ? new Date(`${data.effectiveDate}T00:00:00.000Z`) : null,
        lastReviewed: data.lastReviewed ? new Date(`${data.lastReviewed}T00:00:00.000Z`) : null,
      }
    })

    if (data.status === "published") {
      notifyAllEmployees({
        type: "policy_update",
        title: "New Policy Published",
        message: data.title,
        link: `/policies/${policy.id}`,
      }).catch(() => {})
    }

    await logAudit({
      userId: session!.user.id,
      action: "create",
      resource: "policy",
      resourceId: policy.id,
      details: { title: policy.title, status: policy.status },
      ip,
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 })
  }
}
