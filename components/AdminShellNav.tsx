"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { BarChart3, Users, Network, Briefcase, GraduationCap, FileText, ClipboardCheck, Settings, ChevronDown } from "lucide-react"
import { canAccessAdminSection, type AdminSection } from "@/lib/rbac"

type NavItem = { name: string; href: string; section: AdminSection }
type NavGroup = { label: string; items: NavItem[] }

function NavIcon({ label, className = "h-4 w-4" }: { label: string; className?: string }) {
  switch (label) {
    case "Overview":
      return <BarChart3 className={className} />
    case "Staff":
      return <Users className={className} />
    case "Org":
      return <Network className={className} />
    case "Human Resources":
      return <Briefcase className={className} />
    case "Academy":
      return <GraduationCap className={className} />
    case "Content":
      return <FileText className={className} />
    case "Reviews":
      return <ClipboardCheck className={className} />
    case "Settings":
      return <Settings className={className} />
    default:
      return <BarChart3 className={className} />
  }
}

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

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
      { name: "Organization Chart", href: "/admin/org-chart", section: "org_chart" },
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

  const isGroupActive = group.items.some((item) => isItemActive(pathname, item.href))

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
        <NavIcon label={group.label} />
        {group.label}
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-[#e4eaf3] bg-white py-1 shadow-lg">
          {group.items.map((item) => {
            const isActive = isItemActive(pathname, item.href)
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
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null)

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
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/login"
    }
  }

  const breadcrumbParts = pathname.split("/").filter(Boolean)
  const breadcrumbItems = breadcrumbParts.map((part, idx) => ({
    href: "/" + breadcrumbParts.slice(0, idx + 1).join("/"),
    label: part.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
  }))

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4eaf3] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Wingside® People" width={54} height={54} />
            <div>
              <Link href="/admin" className="group">
                <p className="bg-gradient-to-r from-[#8b4a34] via-[#5b4fb0] to-[#2f7ff5] bg-clip-text text-[1.55rem] font-semibold leading-none tracking-tight text-transparent">
                  Staff Administration
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
              const isActive = isItemActive(pathname, item.href)
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
                  <span className="inline-flex items-center gap-2">
                    <NavIcon label={group.label} />
                    <span>{item.name}</span>
                  </span>
                </Link>
              )
            }
            return <AdminDropdown key={group.label} group={group} pathname={pathname} />
          })}
        </nav>

        <div className="mt-3 border-t border-[#edf2f8] pt-3">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[#6b7280]">
            {breadcrumbItems.map((crumb, idx) => (
              <span key={crumb.href} className="inline-flex items-center">
                {idx > 0 ? <span className="mx-1 text-[#9ca3af]">/</span> : null}
                <Link href={crumb.href} className={idx === breadcrumbItems.length - 1 ? "font-semibold text-[#374151]" : "hover:text-[#1f2937]"}>
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>

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
              <button
                type="button"
                onClick={() => setOpenMobileGroup((prev) => (prev === group.label ? null : group.label))}
                className="flex w-full items-center justify-between rounded-md border border-[#e4eaf3] bg-white px-3 py-2 text-left text-sm font-semibold text-[#374151]"
              >
                <span className="inline-flex items-center gap-2">
                  <NavIcon label={group.label} />
                  <span>{group.label}</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openMobileGroup === group.label ? "rotate-180" : ""}`} />
              </button>
              {openMobileGroup === group.label ? (
                <div className="mt-1 grid grid-cols-1 gap-1">
                  {group.items.map((item) => {
                    const isActive = isItemActive(pathname, item.href)
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
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}
