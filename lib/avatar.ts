import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import path from "path"

export const AVATAR_TYPES: Record<string, { ext: string; mime: string }> = {
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
}

const avatarDir = path.resolve(process.cwd(), "uploads", "avatars")
const legacyAvatarDir = path.resolve(process.cwd(), "public", "uploads", "avatars")

export function getUserAvatarUrl(userId: string) {
  return `/api/profile/photo/${userId}`
}

export function normalizeUserImage(image: string | null, userId: string) {
  if (!image) return null
  if (image === "/api/profile/photo" || image.startsWith("/uploads/avatars/")) {
    return getUserAvatarUrl(userId)
  }
  return image
}

export function getAvatarFilename(userId: string, ext: string) {
  return `${userId}.${ext}`
}

export async function readAvatarForUser(userId: string) {
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

export async function saveAvatarForUser(userId: string, file: File) {
  const fileType = AVATAR_TYPES[file.type]
  if (!fileType) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed")
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size must be under 2MB")
  }

  await mkdir(avatarDir, { recursive: true })

  for (const oldExt of ["jpg", "png", "webp"]) {
    if (oldExt === fileType.ext) continue
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

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.resolve(avatarDir, getAvatarFilename(userId, fileType.ext)), buffer)

  return getUserAvatarUrl(userId)
}
