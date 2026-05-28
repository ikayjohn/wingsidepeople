import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminArea, canAccessAdminSection } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getMissingProfileFields, type ProfileSnapshot } from "@/lib/profile-completion"
import {
  UserCheck,
  Users,
  Briefcase,
  Network,
  Megaphone,
  BookOpen,
  ShieldCheck,
  FolderOpen,
  ClipboardList,
  LineChart,
  GraduationCap,
  Clock3,
  Package,
  MessageSquareText,
  BarChart3,
  TriangleAlert,
  LogOut,
  CalendarDays,
  Inbox,
  Settings,
  type LucideIcon,
} from "lucide-react"

const STAFF_ROLE_FILTER = { notIn: ["admin", "super_admin"] }
type PendingApprovalUser = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  createdAt: Date
}

function DashboardCardIcon({
  section,
  className = "h-6 w-6",
}: {
  section: string
  className?: string
}) {
  const icons: Record<string, LucideIcon> = {
    approvals: UserCheck,
    staff_directory: Users,
    recruitment: Briefcase,
    org_chart: Network,
    announcements: Megaphone,
    handbook: BookOpen,
    policies: ShieldCheck,
    documents: FolderOpen,
    onboarding: ClipboardList,
    performance: LineChart,
    academy: GraduationCap,
    attendance: Clock3,
    assets: Package,
    surveys: MessageSquareText,
    analytics: BarChart3,
    disciplinary: TriangleAlert,
    offboarding: LogOut,
    events: CalendarDays,
    leave_requests: Inbox,
    settings: Settings,
  }
  const Icon = icons[section] ?? BarChart3
  return <Icon className={className} />
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; group?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminArea(session.user.role)) redirect("/dashboard")
  const params = (await searchParams) ?? {}
  const q = (params.q ?? "").trim().toLowerCase()
  const group = (params.group ?? "all").trim().toLowerCase()

  const [statusCounts, activeProfiles, pendingApprovals] = await Promise.all([
    prisma.user.groupBy({
      by: ["status"],
      where: {
        role: STAFF_ROLE_FILTER,
      },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: {
        status: "active",
        role: STAFF_ROLE_FILTER,
      },
      select: {
        employeeId: true,
        gender: true,
        phone: true,
        address: true,
        department: true,
        position: true,
        employmentType: true,
        workLocation: true,
        employmentStartDate: true,
        emergencyContact: true,
        emergencyPhone: true,
        birthday: true,
      },
    }),
    prisma.user.findMany({
      where: {
        status: "pending_approval",
        role: STAFF_ROLE_FILTER,
      },
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ])

  const countByStatus = statusCounts.reduce((acc: Record<string, number>, item: { status: string; _count: { _all: number } }) => {
    acc[item.status] = item._count._all
    return acc
  }, {} as Record<string, number>)
  const totalUsers = statusCounts.reduce(
    (acc: number, item: { _count: { _all: number } }) => acc + item._count._all,
    0
  )
  const activeUsers = countByStatus.active ?? 0
  const pendingUsers = countByStatus.pending_approval ?? 0
  const incompleteProfiles = activeProfiles.filter((profile: ProfileSnapshot) =>
    getMissingProfileFields(profile).length > 0
  ).length
  const urgentPendingUsers = pendingApprovals.filter((u: { createdAt: Date }) => pendingAgeDays(u.createdAt) >= 3).length
  const lastSyncedAt = new Date()

  const cards = [
    {
      href: "/admin/employees",
      section: "approvals" as const,
      title: "Approvals",
      description: "Approve new staff signups",
      iconClass: "bg-amber-100 text-amber-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/employees",
      section: "staff_directory" as const,
      title: "Staff List & Approvals",
      description: "Browse the roster and review signup approvals",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/recruitment",
      section: "recruitment" as const,
      title: "Recruitment",
      description: "Jobs, applicants, and hiring stages",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/org-chart",
      section: "org_chart" as const,
      title: "Organization Chart",
      description: "View reporting lines and team structure",
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      href: "/admin/announcements",
      section: "announcements" as const,
      title: "Announcements",
      description: "Company news",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/handbook",
      section: "handbook" as const,
      title: "Handbook",
      description: "Employee handbook",
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      href: "/admin/policies",
      section: "policies" as const,
      title: "Policies",
      description: "Company policies",
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      href: "/admin/documents",
      section: "documents" as const,
      title: "Documents",
      description: "Files and resources",
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      href: "/admin/onboarding",
      section: "onboarding" as const,
      title: "Onboarding",
      description: "Templates and progress",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/performance",
      section: "performance" as const,
      title: "Performance",
      description: "Goals, KPIs, and review cycles",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/academy",
      section: "academy" as const,
      title: "Academy",
      description: "Courses, assessments, and enrollments",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/attendance",
      section: "attendance" as const,
      title: "Attendance",
      description: "Check-ins, check-outs, and overtime oversight",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/assets",
      section: "assets" as const,
      title: "Assets",
      description: "Inventory, assignments, and returns",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/surveys",
      section: "surveys" as const,
      title: "Surveys",
      description: "Engagement, pulse, and exit interviews",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/analytics",
      section: "analytics" as const,
      title: "Analytics",
      description: "Headcount and operational insights",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/disciplinary",
      section: "disciplinary" as const,
      title: "Disciplinary",
      description: "Cases, actions, and outcomes",
      iconClass: "bg-rose-100 text-rose-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/offboarding",
      section: "offboarding" as const,
      title: "Offboarding",
      description: "Exit workflow and final-day readiness",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/events",
      section: "events" as const,
      title: "Events",
      description: "Calendar management",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/leave-requests",
      section: "leave_requests" as const,
      title: "Leave and Requests",
      description: "Review queues",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
    {
      href: "/admin/settings",
      section: "settings" as const,
      title: "Settings",
      description: "Shared admin configuration",
      iconClass: "bg-slate-100 text-slate-700",
      updatedAt: lastSyncedAt,
    },
  ]
  const visibleCards = cards
    .filter((card) => canAccessAdminSection(session.user.role, card.section))
    .filter((card) => {
      const matchesQuery =
        q.length === 0 ||
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q)
      const matchesGroup =
        group === "all" ||
        (group === "people" && ["approvals", "staff_directory", "recruitment", "onboarding", "offboarding", "attendance", "performance", "disciplinary"].includes(card.section)) ||
        (group === "content" && ["announcements", "handbook", "policies", "documents", "surveys"].includes(card.section)) ||
        (group === "ops" && ["assets", "analytics", "events", "leave_requests", "settings", "academy", "org_chart"].includes(card.section))
      return matchesQuery && matchesGroup
    })
  const dashboardActions = [
    { href: "/admin/employees", label: "Approve Pending" },
    { href: "/admin/announcements", label: "Add Announcement" },
    { href: "/admin/settings", label: "Open Settings" },
  ]

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Portal Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage content, documents, events, and review workflows from one place.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {dashboardActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-full border border-[#d8e1ee] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f8fbff]"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/admin/employees" label="Total staff" value={totalUsers} tone="slate" />
        <StatCard href="/admin/employees?status=active" label="Active staff" value={activeUsers} tone="green" />
        <StatCard href="/admin/employees?status=pending_approval" label="Pending approvals" value={pendingUsers} tone={pendingUsers > 0 ? "amber" : "slate"} />
        <StatCard href="/admin/employees?filter=incomplete_profiles" label="Incomplete profiles" value={incompleteProfiles} tone={incompleteProfiles > 0 ? "rose" : "slate"} />
      </section>

      {pendingApprovals.length > 0 ? (
        <section className="panel mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Approval Queue</h2>
            <Link href="/admin/employees" className="text-sm font-medium text-brand-brown hover:text-brand-brown-light">
              Open approvals
            </Link>
          </div>
          <div className="px-5 py-4">
            <p className="mb-3 text-xs text-gray-500">Urgent (3+ days waiting): {urgentPendingUsers}</p>
            <ul className="space-y-2">
              {pendingApprovals.map((user: PendingApprovalUser) => (
                <li key={user.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.preferredName || user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-brown">
                    {pendingAgeDays(user.createdAt)}d
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="panel mb-6 p-5">
          <h2 className="text-base font-semibold text-gray-900">Approval Queue</h2>
          <p className="mt-2 text-sm text-gray-600">No pending approvals right now. New registration requests will appear here.</p>
          <Link href="/admin/employees" className="mt-3 inline-flex text-sm font-medium text-brand-brown hover:text-brand-brown-light">
            Go to staff list
          </Link>
        </section>
      )}

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Module Finder</p>
        <p className="mt-1 text-sm text-gray-600">Use the cards below to jump into each admin module quickly.</p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" method="get" action="/admin">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search modules"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-gold focus:outline-none"
          />
          <select
            name="group"
            defaultValue={group || "all"}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All groups</option>
            <option value="people">People</option>
            <option value="content">Content</option>
            <option value="ops">Ops</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border border-[#eeb44d] bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown"
          >
            Apply
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link key={`${card.section}:${card.href}`} href={card.href} className="panel block overflow-hidden p-6 transition hover:-translate-y-0.5">
            <div className="flex min-h-[92px] items-start gap-4">
              <div className={`rounded-xl p-3 ${card.iconClass}`}>
                <DashboardCardIcon section={card.section} />
              </div>
              <div className="flex min-h-[68px] flex-1 flex-col justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
                {"updatedAt" in card && card.updatedAt ? (
                  <p className="mt-2 text-xs text-gray-400">Updated {formatRelativeTime(card.updatedAt)}</p>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {visibleCards.length === 0 && (
        <section className="panel mt-6 p-5">
          <h2 className="text-base font-semibold text-gray-900">No modules available</h2>
          <p className="mt-2 text-sm text-gray-600">Your role currently has no admin modules assigned. Contact a super admin to adjust permissions.</p>
        </section>
      )}
    </div>
  )
}

function pendingAgeDays(createdAt: Date) {
  const diffMs = Math.max(0, Date.now() - createdAt.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function StatCard({
  href,
  label,
  value,
  tone,
}: {
  href: string
  label: string
  value: number
  tone: "slate" | "green" | "amber" | "rose"
}) {
  const tones = {
    slate: "border-gray-200 bg-white text-gray-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const

  return (
    <Link href={href} className={`block rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Link>
  )
}

function formatRelativeTime(date: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
