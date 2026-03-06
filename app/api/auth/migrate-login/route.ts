import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp, getRateLimitRetryAfter } from "@/lib/security"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

const migrateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = checkRateLimit(`migrate-login:${ip}`, 25, 15 * 60 * 1000)
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
    const { email, password } = migrateLoginSchema.parse(body)
    const normalizedEmail = email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { email: true, name: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ migrated: false, reason: "no_legacy_user" })
    }

    if (!user?.password) {
      return NextResponse.json({ migrated: false, reason: "no_legacy_password" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ migrated: false, reason: "invalid_legacy_password" })
    }

    let error: { message: string } | null = null
    try {
      const admin = getSupabaseAdminClient()
      const result = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: user.name },
      })
      error = result.error
    } catch (createErr) {
      console.error("migrate-login createUser failed:", createErr)
      return NextResponse.json({ migrated: false })
    }

    if (error) {
      const message = error.message.toLowerCase()
      const isAlreadyProvisioned =
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("registered") ||
        message.includes("duplicate")

      if (!isAlreadyProvisioned) {
        console.error("migrate-login non-retryable createUser error:", error.message)
        return NextResponse.json({ migrated: false, reason: "provision_failed" })
      }
    }

    return NextResponse.json({ migrated: true, reason: "migrated_or_exists" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("migrate-login unexpected error:", error)
    return NextResponse.json({ migrated: false, reason: "unexpected" })
  }
}
