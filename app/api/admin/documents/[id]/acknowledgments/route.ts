import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

const STAFF_WHERE = {
  role: { notIn: ["admin", "super_admin"] },
  status: { not: "exited" },
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true },
  })
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const [acknowledgments, totalEmployees] = await Promise.all([
    prisma.documentAcknowledgment.findMany({
      where: {
        documentId: id,
        user: STAFF_WHERE,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { acknowledgedAt: "desc" },
    }),
    prisma.user.count({
      where: STAFF_WHERE,
    }),
  ])

  return NextResponse.json({
    document,
    acknowledgments,
    totalEmployees,
    acknowledgedCount: acknowledgments.length,
  })
}
