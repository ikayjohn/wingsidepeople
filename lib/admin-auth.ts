import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getClientIp, isIpAllowed } from "@/lib/security"
import { canAccessAdminArea } from "@/lib/rbac"

export async function requireAdmin(req?: Request) {
  const session = await auth()
  const ip = getClientIp(req || null)

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null }
  }

  if (!canAccessAdminArea(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null }
  }

  if (!isIpAllowed(ip, process.env.ADMIN_IP_ALLOWLIST)) {
    return { error: NextResponse.json({ error: "Forbidden from this IP" }, { status: 403 }), session: null }
  }

  return { error: null, session, ip }
}
