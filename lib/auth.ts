import { prisma } from "@/lib/prisma"
import { normalizeRole } from "@/lib/rbac"
import type { AppSession } from "@/lib/session"
import { normalizeUserImage } from "@/lib/avatar"
import { cookies } from "next/headers"
import { hashToken, SESSION_COOKIE_NAME } from "@/lib/internal-auth"

export async function auth(): Promise<AppSession | null> {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!rawToken) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(rawToken) },
    select: {
      id: true,
      expires: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          lastLogin: true,
        },
      },
    },
  })

  if (!session || session.expires <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    }
    return null
  }

  const dbUser = session.user
  if (dbUser.status !== "active") return null

  // Only update lastLogin at most once per hour to avoid unnecessary DB writes
  const ONE_HOUR = 60 * 60 * 1000
  if (!dbUser.lastLogin || Date.now() - dbUser.lastLogin.getTime() > ONE_HOUR) {
    prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLogin: new Date() },
      select: { id: true },
    }).catch(() => {/* fire-and-forget */})
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: normalizeUserImage(dbUser.image, dbUser.id),
      role: normalizeRole(dbUser.role),
    },
  }
}
