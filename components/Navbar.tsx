"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import SearchBar from "@/components/SearchBar"
import NotificationBell from "@/components/NotificationBell"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { AppSession } from "@/lib/session"
import { canAccessAdminArea } from "@/lib/rbac"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Directory", href: "/directory" },
  { name: "Recognition", href: "/recognition" },
  { name: "Messages", href: "/messages" },
  { name: "Announcements", href: "/announcements" },
  { name: "Resources", href: "/handbook" },
  { name: "Policies", href: "/policies" },
  { name: "Documents", href: "/documents" },
  { name: "Leave & Requests", href: "/leave" },
  { name: "Onboarding", href: "/onboarding" },
  { name: "Calendar", href: "/calendar" },
]

type NavbarProps = {
  session: AppSession
}

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[#e4eaf3] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <Image src="/logo.png" alt="Wingernet" width={60} height={60} />
            <div>
              <p className="bg-gradient-to-r from-[#8b4a34] via-[#5b4fb0] to-[#2f7ff5] bg-clip-text text-[1.55rem] font-semibold leading-none tracking-tight text-transparent">
                Wingernet
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#6b7280]">Employee Portal</p>
            </div>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <SearchBar />
            <NotificationBell />
            <Link
              href="/profile"
              className="rounded-full border border-[#d8e1ee] bg-white px-3 py-1.5 text-sm text-[#374151] hover:-translate-y-0.5 hover:border-[#bfd0e7] hover:bg-[#f8fbff]"
            >
              {session?.user?.name || session?.user?.email}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-[#eeb44d] bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-brown hover:-translate-y-0.5"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-4 hidden items-center gap-2 overflow-x-auto border-t border-[#edf2f8] pt-4 md:flex">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                    : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
          {canAccessAdminArea(session?.user?.role) && (
            <Link
              href="/admin"
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                  : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
              }`}
            >
              Admin
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-[#edf2f8] px-3 py-3 md:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/profile" className="text-sm text-[#4b5563]">
              {session?.user?.name || session?.user?.email}
            </Link>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-[#eeb44d] bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-brown"
          >
            Sign out
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                    : "text-[#4b5563] hover:bg-[#f3f7fd] hover:text-[#1f2937]"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
          {canAccessAdminArea(session?.user?.role) && (
            <Link
              href="/admin"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                  : "text-[#4b5563] hover:bg-[#f3f7fd] hover:text-[#1f2937]"
              }`}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
