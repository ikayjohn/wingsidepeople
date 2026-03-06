import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: "ok",
      service: "wingside-portal",
      timestamp: new Date().toISOString(),
      database: "ok",
    })
  } catch (error) {
    logger.error("health.check.failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        status: "degraded",
        service: "wingside-portal",
        timestamp: new Date().toISOString(),
        database: "down",
      },
      { status: 503 }
    )
  }
}
