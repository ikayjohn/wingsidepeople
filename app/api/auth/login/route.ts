import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { normalizeRole } from "@/lib/rbac"
import { createUserSession } from "@/lib/internal-auth"
import { checkRateLimitPersistent, getClientIp, getRateLimitRetryAfter } from "@/lib/security"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = await checkRateLimitPersistent({
      scope: "login",
      key: `login:${ip}`,
      max: 25,
      windowMs: 15 * 60 * 1000,
      ip,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(getRateLimitRetryAfter(rate.resetAt)) },
        }
      )
    }

    const body = await req.json()
    const { email, password } = loginSchema.parse(body)
    const normalizedEmail = email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, password: true, status: true, role: true },
    })

    if (!user?.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.status === "pending_approval") {
      return NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 })
    }
    if (user.status === "rejected") {
      return NextResponse.json({ error: "Your account registration was rejected. Contact HR/admin." }, { status: 403 })
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: "Your account is not active. Contact admin." }, { status: 403 })
    }

    await createUserSession(user.id)

    return NextResponse.json({ ok: true, role: normalizeRole(user.role) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 })
  }
}

