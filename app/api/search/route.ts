import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

const SEARCHABLE_TYPES = ["all", "announcements", "handbook", "policies", "documents", "events"] as const

export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const type = (searchParams.get("type") || "all").trim()
  const category = searchParams.get("category")?.trim()
  const rawLimit = Number(searchParams.get("limit") || 5)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5

  if (!q || q.length < 2) {
    return NextResponse.json({ announcements: [], handbook: [], policies: [], documents: [], events: [] })
  }

  if (!SEARCHABLE_TYPES.includes(type as (typeof SEARCHABLE_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
  }

  const textMatch = (field: string) =>
    ({ [field]: { contains: q, mode: "insensitive" } }) as Record<string, unknown>

  const includeType = (candidate: string) => type === "all" || type === candidate
  const isAdmin = session!.user.role === "admin"

  const [announcements, handbook, policies, documents, events] = await Promise.all([
    includeType("announcements")
      ? prisma.announcement.findMany({
          where: {
            OR: [textMatch("title"), textMatch("content")],
          },
          select: { id: true, title: true, publishedAt: true },
          take: limit,
          orderBy: { publishedAt: "desc" },
        })
      : Promise.resolve([]),
    includeType("handbook")
      ? prisma.handbookSection.findMany({
          where: {
            OR: [textMatch("title"), textMatch("content")],
          },
          select: { id: true, title: true, slug: true },
          take: limit,
          orderBy: { order: "asc" },
        })
      : Promise.resolve([]),
    includeType("policies")
      ? prisma.policy.findMany({
          where: {
            ...(isAdmin ? {} : { status: "published" }),
            ...(category ? { category } : {}),
            OR: [textMatch("title"), textMatch("summary"), textMatch("content")],
          },
          select: { id: true, title: true, category: true, status: true },
          take: limit,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    includeType("documents")
      ? prisma.document.findMany({
          where: {
            ...(category ? { category } : {}),
            OR: [textMatch("title"), textMatch("description"), textMatch("filename")],
          },
          select: { id: true, title: true, category: true, version: true },
          take: limit,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    includeType("events")
      ? prisma.event.findMany({
          where: {
            ...(category ? { category } : {}),
            OR: [textMatch("title"), textMatch("description")],
          },
          select: { id: true, title: true, category: true, startDate: true },
          take: limit,
          orderBy: { startDate: "asc" },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({ announcements, handbook, policies, documents, events })
}
