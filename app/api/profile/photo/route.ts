import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { writeFile, mkdir, readFile, unlink } from "fs/promises"
import path from "path"

const AVATAR_TYPES: Record<string, { ext: string; mime: string }> = {
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
}

const avatarDir = path.resolve(process.cwd(), "uploads", "avatars")
const legacyAvatarDir = path.resolve(process.cwd(), "public", "uploads", "avatars")

function getAvatarFilename(userId: string, ext: string) {
  return `${userId}.${ext}`
}

async function readAvatarForUser(userId: string) {
  const candidates = ["jpg", "png", "webp"]
  for (const ext of candidates) {
    const filename = getAvatarFilename(userId, ext)
    const currentPath = path.resolve(avatarDir, filename)
    const legacyPath = path.resolve(legacyAvatarDir, filename)

    try {
      const buffer = await readFile(currentPath)
      return { buffer, mime: AVATAR_TYPES[`image/${ext === "jpg" ? "jpeg" : ext}`].mime }
    } catch {
      try {
        const buffer = await readFile(legacyPath)
        return { buffer, mime: AVATAR_TYPES[`image/${ext === "jpg" ? "jpeg" : ext}`].mime }
      } catch {
        // continue
      }
    }
  }
  return null
}

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

    if (!AVATAR_TYPES[file.type]) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 2MB" }, { status: 400 })
    }

    const { ext } = AVATAR_TYPES[file.type]
    const userId = session!.user.id
    const filename = getAvatarFilename(userId, ext)

    await mkdir(avatarDir, { recursive: true })

    for (const oldExt of ["jpg", "png", "webp"]) {
      if (oldExt === ext) continue
      const oldFilename = getAvatarFilename(userId, oldExt)
      try {
        await unlink(path.resolve(avatarDir, oldFilename))
      } catch {
        // ignore
      }
      try {
        await unlink(path.resolve(legacyAvatarDir, oldFilename))
      } catch {
        // ignore
      }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(path.resolve(avatarDir, filename), buffer)

    const imagePath = "/api/profile/photo"
    await prisma.user.update({
      where: { id: session!.user.id },
      data: { image: imagePath },
    })

    return NextResponse.json({ image: imagePath })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
