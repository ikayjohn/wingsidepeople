import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimitPersistent, getClientIp, getRateLimitRetryAfter } from "@/lib/security"

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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Password reset is not configured." }, { status: 500 })
    }

    const supabase = createClient(url, anonKey)
    const origin = new URL(req.url).origin
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

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
