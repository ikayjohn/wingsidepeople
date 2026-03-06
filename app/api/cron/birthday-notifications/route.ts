import { NextResponse } from "next/server"
import { sendDailyBirthdayNotifications } from "@/lib/birthday-notifications"

async function run(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const secret = process.env.CRON_SECRET

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await sendDailyBirthdayNotifications()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: Request) {
  return run(req)
}

export async function GET(req: Request) {
  return run(req)
}
