"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { canAccessAdminSection, type AdminSection } from "@/lib/rbac"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type NavItem = { name: string; href: string; section: AdminSection }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin", section: "dashboard" },
      { name: "Analytics", href: "/admin/analytics", section: "analytics" },
    ],
  },
  {
    label: "Staff",
    items: [
      { name: "Staff List & Approvals", href: "/admin/employees", section: "staff_directory" },
    ],
  },
  {
    label: "Org",
    items: [
      { name: "Org Chart", href: "/admin/org-chart", section: "org_chart" },
    ],
  },
  {
    label: "Human Resources",
    items: [
      { name: "Recruitment", href: "/admin/recruitment", section: "recruitment" },
      { name: "Onboarding", href: "/admin/onboarding", section: "onboarding" },
      { name: "Offboarding", href: "/admin/offboarding", section: "offboarding" },
      { name: "Attendance", href: "/admin/attendance", section: "attendance" },
      { name: "Performance", href: "/admin/performance", section: "performance" },
      { name: "Assets", href: "/admin/assets", section: "assets" },
      { name: "Disciplinary", href: "/admin/disciplinary", section: "disciplinary" },
      { name: "Work Locations", href: "/admin/work-locations", section: "work_locations" },
    ],
  },
  {
    label: "Academy",
    items: [
      { name: "Academy", href: "/admin/academy", section: "academy" },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Announcements", href: "/admin/announcements", section: "announcements" },
      { name: "Handbook", href: "/admin/handbook", section: "handbook" },
      { name: "Policies", href: "/admin/policies", section: "policies" },
      { name: "Documents", href: "/admin/documents", section: "documents" },
      { name: "Surveys", href: "/admin/surveys", section: "surveys" },
    ],
  },
  {
    label: "Reviews",
    items: [
      { name: "Leave & Requests", href: "/admin/leave-requests", section: "leave_requests" },
      { name: "Events", href: "/admin/events", section: "events" },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Settings", href: "/admin/settings", section: "settings" },
    ],
  },
]

function AdminDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
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
                onClick={() => setOpen(false)}
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

export default function AdminShellNav({ role }: { role: string }) {
  const pathname = usePathname()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessAdminSection(role, item.section)),
    }))
    .filter((group) => group.items.length > 0)

  const handleLogout = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4eaf3] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Wingernet" width={54} height={54} />
            <div>
              <Link href="/admin" className="group">
                <p className="bg-gradient-to-r from-[#8b4a34] via-[#5b4fb0] to-[#2f7ff5] bg-clip-text text-[1.55rem] font-semibold leading-none tracking-tight text-transparent">
                  Wingernet Admin
                </p>
              </Link>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                Operations Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-[#d8e1ee] bg-white px-3 py-1.5 text-sm text-[#374151] hover:-translate-y-0.5 hover:border-[#bfd0e7] hover:bg-[#f8fbff]"
            >
              Back to Portal
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="rounded-full border border-[#eeb44d] bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-brown disabled:opacity-60"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>

        {/* Desktop grouped dropdown nav */}
        <nav className="mt-4 hidden items-center gap-1 border-t border-[#edf2f8] pt-4 md:flex md:flex-wrap">
          {visibleGroups.map((group) => {
            if (group.items.length === 1) {
              const item = group.items[0]
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
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
            }
            return <AdminDropdown key={group.label} group={group} pathname={pathname} />
          })}
        </nav>

        {/* Mobile nav */}
        <nav className="mt-3 border-t border-[#edf2f8] pt-3 md:hidden">
          <div className="mb-3 flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 rounded-md border border-[#d8e1ee] bg-white px-3 py-2 text-center text-sm font-medium text-[#374151]"
            >
              Back to Portal
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="flex-1 rounded-md border border-[#eeb44d] bg-brand-gold px-3 py-2 text-sm font-medium text-brand-brown disabled:opacity-60"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
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
              </div>
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}
