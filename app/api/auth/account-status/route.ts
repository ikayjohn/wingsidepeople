import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimitPersistent, getClientIp, getRateLimitRetryAfter } from "@/lib/security"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = await checkRateLimitPersistent({
      scope: "account_status",
      key: `account-status:${ip}`,
      max: 40,
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
    schema.parse(body)
    // Intentionally generic to avoid leaking account existence/state pre-authentication.
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to determine account status." }, { status: 500 })
  }
}
