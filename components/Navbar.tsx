"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import SearchBar from "@/components/SearchBar"
import NotificationBell from "@/components/NotificationBell"
import type { AppSession } from "@/lib/session"
import { canAccessAdminArea } from "@/lib/rbac"

type NavGroup = {
  label: string
  items: { name: string; href: string }[]
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Directory", href: "/directory" },
      { name: "Org Chart", href: "/org-chart" },
    ],
  },
  {
    label: "Work",
    items: [
      { name: "Leave & Requests", href: "/leave" },
      { name: "Attendance", href: "/attendance" },
      { name: "Disciplinary", href: "/disciplinary" },
      { name: "My KPIs", href: "/my-kpis" },
      { name: "My Assets", href: "/my-assets" },
    ],
  },
  {
    label: "Learn",
    items: [
      { name: "Academy", href: "/academy" },
      { name: "Surveys", href: "/surveys" },
    ],
  },
  {
    label: "Connect",
    items: [
      { name: "Messages", href: "/messages" },
      { name: "Recognition", href: "/recognition" },
      { name: "Announcements", href: "/announcements" },
      { name: "Calendar", href: "/calendar" },
    ],
  },
  {
    label: "Resources",
    items: [
      { name: "Handbook", href: "/handbook" },
      { name: "Policies", href: "/policies" },
      { name: "Documents", href: "/documents" },
    ],
  },
]

type NavbarProps = {
  session: AppSession
}

function DropdownGroup({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const isGroupActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
          isGroupActive
            ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
            : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
        }`}
      >
        {group.label}
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-[#e4eaf3] bg-white py-1 shadow-lg">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { setOpen(false); onNavigate() }}
                className={`block px-4 py-2 text-sm ${
                  isActive
                    ? "bg-[#fff8e1] font-medium text-brand-brown"
                    : "text-[#4b5563] hover:bg-[#f3f7fd] hover:text-[#1f2937]"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
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

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-[#4b5563] hover:bg-[#f3f7fd] md:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop nav with dropdowns */}
        <div className="mt-4 hidden items-center gap-1 border-t border-[#edf2f8] pt-4 md:flex md:flex-wrap">
          <Link
            href="/dashboard"
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
              pathname === "/dashboard"
                ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
            }`}
          >
            Dashboard
          </Link>
          {navGroups.filter((g) => g.label !== "Main").map((group) => (
            <DropdownGroup key={group.label} group={group} pathname={pathname} onNavigate={() => {}} />
          ))}
          <Link
            href="/directory"
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
              pathname === "/directory" || pathname.startsWith("/directory/")
                ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
            }`}
          >
            Directory
          </Link>
          <Link
            href="/org-chart"
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
              pathname === "/org-chart"
                ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                : "text-[#4b5563] hover:-translate-y-0.5 hover:bg-[#f3f7fd] hover:text-[#1f2937]"
            }`}
          >
            Org Chart
          </Link>
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

      {/* Mobile nav */}
      {mobileOpen && (
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
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
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
              </div>
            </div>
          ))}
          {canAccessAdminArea(session?.user?.role) && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-[#ffe08f] to-[#ffc64d] text-brand-brown"
                  : "text-[#4b5563] hover:bg-[#f3f7fd] hover:text-[#1f2937]"
              }`}
            >
              Admin Panel
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
