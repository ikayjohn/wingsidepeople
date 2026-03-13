import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { readAvatarForUser, saveAvatarForUser } from "@/lib/avatar"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const avatar = await readAvatarForUser(session!.user.id)
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

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get("photo") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const userId = session!.user.id
    const imagePath = await saveAvatarForUser(userId, file)

    await prisma.user.update({
      where: { id: userId },
      data: { image: imagePath },
    })

    return NextResponse.json({ image: imagePath })
  } catch (error) {
    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
