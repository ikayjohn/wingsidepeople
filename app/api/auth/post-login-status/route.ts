import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeRole } from "@/lib/rbac"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user?.email) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const email = data.user.email.toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
      select: { status: true, role: true },
    })

    return NextResponse.json({
      authenticated: true,
      status: user?.status ?? "pending_approval",
      role: normalizeRole(user?.role),
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}

