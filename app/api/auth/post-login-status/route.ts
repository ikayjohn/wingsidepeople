import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    return NextResponse.json({
      authenticated: true,
      status: "active",
      role: session.user.role,
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
