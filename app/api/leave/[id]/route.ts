import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })
  if (!request) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  }
  if (request.userId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be canceled" }, { status: 400 })
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "canceled", reviewedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
