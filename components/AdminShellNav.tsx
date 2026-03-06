"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { canAccessAdminSection } from "@/lib/rbac"

const navItems = [
  { name: "Dashboard", href: "/admin", section: "dashboard" as const },
  { name: "Approvals", href: "/admin/employees", section: "approvals" as const },
  { name: "Announcements", href: "/admin/announcements", section: "announcements" as const },
  { name: "Handbook", href: "/admin/handbook", section: "handbook" as const },
  { name: "Policies", href: "/admin/policies", section: "policies" as const },
  { name: "Documents", href: "/admin/documents", section: "documents" as const },
  { name: "Onboarding", href: "/admin/onboarding", section: "onboarding" as const },
  { name: "Events", href: "/admin/events", section: "events" as const },
  { name: "Leave & Requests", href: "/admin/leave-requests", section: "leave_requests" as const },
]

export default function AdminShellNav({ role }: { role: string }) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => canAccessAdminSection(role, item.section))

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

          <Link
            href="/dashboard"
            className="rounded-full border border-[#d8e1ee] bg-white px-3 py-1.5 text-sm text-[#374151] hover:-translate-y-0.5 hover:border-[#bfd0e7] hover:bg-[#f8fbff]"
          >
            Back to Portal
          </Link>
        </div>

        <nav className="mt-4 hidden items-center gap-2 overflow-x-auto border-t border-[#edf2f8] pt-4 md:flex">
          {visibleItems.map((item) => {
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
          })}
        </nav>

        <nav className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf2f8] pt-3 md:hidden">
          {visibleItems.map((item) => {
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
        </nav>
      </div>
    </header>
  )
}
