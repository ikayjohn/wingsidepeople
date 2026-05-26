import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimitPersistent, getClientIp, getRateLimitRetryAfter } from "@/lib/security"
import { generateToken, hashToken } from "@/lib/internal-auth"
import { sendPasswordResetEmail } from "@/lib/email"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = await checkRateLimitPersistent({
      scope: "forgot_password",
      key: `forgot-password:${ip}`,
      max: 20,
      windowMs: 15 * 60 * 1000,
      ip,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(getRateLimitRetryAfter(rate.resetAt)) },
        }
      )
    }

    const body = await req.json()
    const { email } = schema.parse(body)

    const normalizedEmail = email.toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (user) {
      const rawToken = generateToken(32)
      const token = hashToken(rawToken)
      const identifier = `password-reset:${normalizedEmail}`
      const expires = new Date(Date.now() + 1000 * 60 * 60)

      await prisma.verificationToken.deleteMany({ where: { identifier } })
      await prisma.verificationToken.create({
        data: {
          identifier,
          token,
          expires,
        },
      })

      const origin = new URL(req.url).origin
      const resetUrl = `${origin}/reset-password?token=${rawToken}`
      try {
        const result = await sendPasswordResetEmail(normalizedEmail, resetUrl)
        if (!result.sent) {
          console.warn(`Password reset email not sent (${result.reason}) for ${normalizedEmail}`)
          console.info(`Password reset link for ${normalizedEmail}: ${resetUrl}`)
        }
      } catch (emailError) {
        console.error("Password reset email send failed:", emailError)
        console.info(`Password reset link for ${normalizedEmail}: ${resetUrl}`)
      }
    }

    // Return generic success to prevent account enumeration
    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to process request." }, { status: 500 })
  }
}
