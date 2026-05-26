import { NextResponse } from "next/server"
import { destroyUserSession } from "@/lib/internal-auth"

export async function POST() {
  await destroyUserSession()
  return NextResponse.json({ ok: true })
}

