import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp, getRateLimitRetryAfter } from "@/lib/security"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = checkRateLimit(`account-status:${ip}`, 40, 15 * 60 * 1000)
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
      select: {
        id: true,
        status: true,
        role: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      status: user.status,
      role: user.role,
      hasLegacyPassword: !!user.password,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to determine account status." }, { status: 500 })
  }
}

