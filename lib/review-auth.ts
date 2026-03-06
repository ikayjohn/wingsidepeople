import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { canReviewRequests } from "@/lib/rbac"
import { getClientIp } from "@/lib/security"

export async function requireRequestReviewer(req?: Request) {
  const session = await auth()
  const ip = getClientIp(req || null)

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null }
  }

  if (!canReviewRequests(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null }
  }

  return { error: null, session, ip }
}
