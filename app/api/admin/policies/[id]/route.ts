import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { notifyAllEmployees } from "@/lib/notifications"
import { logAudit } from "@/lib/audit"

const VALID_CATEGORIES = ["hr", "it", "operations", "finance", "legal", "workplace", "other"] as const

const updatePolicySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(1).max(500_000).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD").optional().nullable(),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Last reviewed date must be YYYY-MM-DD").optional().nullable(),
  status: z.enum(["draft", "in_review", "published"]).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const { id } = await params
    const policy = await prisma.policy.findUnique({
      where: { id }
    })

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    return NextResponse.json(policy)
  } catch {
    return NextResponse.json({ error: "Failed to fetch policy" }, { status: 500 })
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
    const data = updatePolicySchema.parse(body)
    const previous = await prisma.policy.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    })
    if (!previous) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    if (data.slug) {
      const existing = await prisma.policy.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      })

      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "A policy with this slug already exists" }, { status: 409 })
      }
    }

    const policy = await prisma.policy.update({
      where: { id },
      data: {
        ...data,
        effectiveDate: data.effectiveDate !== undefined
          ? (data.effectiveDate ? new Date(`${data.effectiveDate}T00:00:00.000Z`) : null)
          : undefined,
        lastReviewed: data.lastReviewed !== undefined
          ? (data.lastReviewed ? new Date(`${data.lastReviewed}T00:00:00.000Z`) : null)
          : undefined,
      }
    })

    if (previous.status !== "published" && policy.status === "published") {
      notifyAllEmployees({
        type: "policy_update",
        title: "Policy Published",
        message: policy.title,
        link: `/policies/${policy.id}`,
      }).catch(() => {})
    }

    await logAudit({
      userId: session!.user.id,
      action: "update",
      resource: "policy",
      resourceId: policy.id,
      details: { title: policy.title, fromStatus: previous.status, toStatus: policy.status },
      ip,
    })

    return NextResponse.json(policy)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update policy" }, { status: 500 })
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
    const existing = await prisma.policy.findUnique({
      where: { id },
      select: { id: true, title: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    await prisma.policy.delete({
      where: { id }
    })

    await logAudit({
      userId: session!.user.id,
      action: "delete",
      resource: "policy",
      resourceId: id,
      details: { title: existing.title },
      ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 })
  }
}
