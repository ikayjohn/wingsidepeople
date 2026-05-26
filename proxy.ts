import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/internal-auth"

// Public paths that do NOT require authentication
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export default async function proxy(req: NextRequest) {
  const response = NextResponse.next({
    request: { headers: req.headers },
  })

  const pathname = req.nextUrl.pathname

  // Allow public pages, auth API routes, and health check through without a session check
  if (isPublicPath(pathname) || pathname.startsWith("/api/auth/") || pathname === "/api/health") {
    return response
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
