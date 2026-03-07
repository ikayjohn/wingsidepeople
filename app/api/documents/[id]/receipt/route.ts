import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const receipt = await prisma.documentAcknowledgment.findUnique({
    where: {
      documentId_userId: {
        documentId: id,
        userId: session!.user.id,
      },
    },
    select: { acknowledgedAt: true },
  })

  return NextResponse.json({
    acknowledged: !!receipt,
    acknowledgedAt: receipt?.acknowledgedAt ?? null,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const receipt = await prisma.documentAcknowledgment.upsert({
    where: {
      documentId_userId: {
        documentId: id,
        userId: session!.user.id,
      },
    },
    update: {},
    create: {
      documentId: id,
      userId: session!.user.id,
    },
    select: { acknowledgedAt: true },
  })

  return NextResponse.json({
    acknowledged: true,
    acknowledgedAt: receipt.acknowledgedAt,
  })
}
