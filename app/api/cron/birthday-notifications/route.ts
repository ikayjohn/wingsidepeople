import { NextResponse } from "next/server"
import { sendDailyBirthdayNotifications } from "@/lib/birthday-notifications"
import { logger } from "@/lib/logger"

async function run(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const secret = process.env.CRON_SECRET

    if (!secret || token !== secret) {
      logger.warn("cron.birthdays.unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sendDailyBirthdayNotifications()
    logger.info("cron.birthdays.success", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error("cron.birthdays.failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Failed to send birthday notifications" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return run(req)
}

export async function GET(req: Request) {
  return run(req)
}
