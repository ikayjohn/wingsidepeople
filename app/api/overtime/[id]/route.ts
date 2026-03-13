import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params
  const request = await prisma.overtimeRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })

  if (!request || request.userId !== session!.user.id) {
    return NextResponse.json({ error: "Overtime request not found" }, { status: 404 })
  }

  if (request.status !== "pending_manager") {
    return NextResponse.json({ error: "Only pending overtime requests can be cancelled" }, { status: 400 })
  }

  await prisma.overtimeRequest.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
