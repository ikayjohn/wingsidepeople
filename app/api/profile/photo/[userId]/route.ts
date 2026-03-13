import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { readAvatarForUser } from "@/lib/avatar"

export async function GET(_: Request, context: { params: Promise<{ userId: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { userId } = await context.params
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  })

  if (!target || target.status === "exited") {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 })
  }

  const avatar = await readAvatarForUser(userId)
  if (!avatar) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 })
  }

  return new NextResponse(avatar.buffer, {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  })
}
