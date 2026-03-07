import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

const STAFF_WHERE = {
  role: { notIn: ["admin", "super_admin"] },
  status: { not: "exited" },
}

type DocumentWithAcknowledgments = {
  id: string
  title: string
  category: string
  acknowledgments: { id: string }[]
}

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const [documents, totalEmployees] = await Promise.all([
    prisma.document.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        acknowledgments: {
          where: {
            user: STAFF_WHERE,
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({
      where: STAFF_WHERE,
    }),
  ])

  const stats = (documents as DocumentWithAcknowledgments[]).map((document: DocumentWithAcknowledgments) => ({
    id: document.id,
    title: document.title,
    category: document.category,
    acknowledgedCount: document.acknowledgments.length,
    totalEmployees,
    percentage: totalEmployees > 0
      ? Math.round((document.acknowledgments.length / totalEmployees) * 100)
      : 0,
  }))

  return NextResponse.json({ stats })
}
