import { NextResponse } from "next/server"
import { sendPendingApprovalReminders } from "@/lib/approval-reminders"
import { logger } from "@/lib/logger"

async function run(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const secret = process.env.CRON_SECRET

    if (!secret || token !== secret) {
      logger.warn("cron.approval-reminders.unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sendPendingApprovalReminders()
    logger.info("cron.approval-reminders.success", result)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    logger.error("cron.approval-reminders.failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Failed to send approval reminders" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return run(req)
}

export async function GET(req: Request) {
  return run(req)
}
