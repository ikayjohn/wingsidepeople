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

  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 })
  }

  const receipt = await prisma.policyAcknowledgment.findUnique({
    where: {
      policyId_userId: {
        policyId: id,
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

  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 })
  }

  const receipt = await prisma.policyAcknowledgment.upsert({
    where: {
      policyId_userId: {
        policyId: id,
        userId: session!.user.id,
      },
    },
    update: {},
    create: {
      policyId: id,
      userId: session!.user.id,
    },
    select: { acknowledgedAt: true },
  })

  return NextResponse.json({ acknowledged: true, acknowledgedAt: receipt.acknowledgedAt })
}

