import { cookies } from "next/headers"
import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export const SESSION_COOKIE_NAME = "wingernet_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("hex")
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createUserSession(userId: string) {
  const rawToken = generateToken(32)
  const sessionToken = hashToken(rawToken)
  const expires = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expires,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  })
}

export async function destroyUserSession() {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (rawToken) {
    const sessionToken = hashToken(rawToken)
    await prisma.session.deleteMany({ where: { sessionToken } })
  }
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  })
}

