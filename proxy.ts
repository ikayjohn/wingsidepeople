import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPaths = [
  "/dashboard",
  "/admin",
  "/announcements",
  "/handbook",
  "/policies",
  "/documents",
  "/profile",
  "/notifications",
  "/onboarding",
  "/calendar",
]

export default async function proxy(req: NextRequest) {
  let response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          req.cookies.set(cookie.name, cookie.value)
        }

        response = NextResponse.next({
          request: req,
        })

        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = !!user
  const pathname = req.nextUrl.pathname
  const isOnProtectedPage = protectedPaths.some((p) => pathname.startsWith(p))

  if (isOnProtectedPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
