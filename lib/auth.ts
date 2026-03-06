import { prisma } from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"
import { normalizeRole } from "@/lib/rbac"
import type { AppSession } from "@/lib/session"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function auth(): Promise<AppSession | null> {
  let supabase
  try {
    supabase = await getSupabaseServerClient()
  } catch {
    return null
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user || !data.user.email) return null

  const email = data.user.email.toLowerCase()

  const userSelect = {
    id: true,
    email: true,
    name: true,
    image: true,
    role: true,
    status: true,
    lastLogin: true,
  } as const

  const nameFromAuth = data.user.user_metadata?.name ?? null
  let dbUser = await prisma.user.findUnique({
    where: { email },
    select: userSelect,
  })

  if (!dbUser) {
    try {
      dbUser = await prisma.user.create({
        data: {
          email,
          name: nameFromAuth,
          status: "pending_approval",
        },
        select: userSelect,
      })
    } catch (error) {
      const isUniqueConflict =
        error instanceof PrismaClientKnownRequestError && error.code === "P2002"
      if (!isUniqueConflict) throw error

      // If another parallel request just created this user, re-read it.
      dbUser = await prisma.user.findUnique({
        where: { email },
        select: userSelect,
      })
    }
  } else if (nameFromAuth && dbUser.name !== nameFromAuth) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { name: nameFromAuth },
      select: userSelect,
    })
  }

  if (!dbUser) return null

  if (dbUser.status !== "active") {
    return null
  }

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
      image: dbUser.image,
      role: normalizeRole(dbUser.role),
    },
  }
}
