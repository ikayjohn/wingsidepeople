import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function requireAuth() {
  const session = await auth()

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null }
  }

  return { error: null, session }
}
