import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminArea, canAccessAdminSection } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getMissingProfileFields, type ProfileSnapshot } from "@/lib/profile-completion"

const STAFF_ROLE_FILTER = { notIn: ["admin", "super_admin"] }
type PendingApprovalUser = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  createdAt: Date
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminArea(session.user.role)) redirect("/dashboard")

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

  const cards = [
    {
      href: "/admin/employees",
      section: "approvals" as const,
      title: "Approvals",
      description: "Approve new staff signups",
      iconClass: "bg-violet-100 text-violet-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m12-8a4 4 0 11-8 0 4 4 0 018 0z"
        />
      ),
    },
    {
      href: "/admin/employees",
      section: "staff_directory" as const,
      title: "Staff List & Approvals",
      description: "Browse the roster and review signup approvals",
      iconClass: "bg-slate-100 text-slate-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0H7m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10-8a3 3 0 11-6 0 3 3 0 016 0M7 10h.01M7 14h.01"
        />
      ),
    },
    {
      href: "/admin/recruitment",
      section: "recruitment" as const,
      title: "Recruitment",
      description: "Jobs, applicants, and hiring stages",
      iconClass: "bg-fuchsia-100 text-fuchsia-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18 9V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4m12 0v9a2 2 0 01-2 2H8a2 2 0 01-2-2V9m12 0H6m6 4v4m-2-2h4"
        />
      ),
    },
    {
      href: "/admin/org-chart",
      section: "org_chart" as const,
      title: "Org Chart",
      description: "View reporting lines and team structure",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v4m0 0H7m5 0h5m-9 0v6m4-6v6m4-6v6M5 19h4m6 0h4"
        />
      ),
    },
    {
      href: "/admin/announcements",
      section: "announcements" as const,
      title: "Announcements",
      description: "Company news",
      iconClass: "bg-brand-gold-light text-brand-brown",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      ),
    },
    {
      href: "/admin/handbook",
      section: "handbook" as const,
      title: "Handbook",
      description: "Employee handbook",
      iconClass: "bg-emerald-100 text-emerald-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      ),
    },
    {
      href: "/admin/policies",
      section: "policies" as const,
      title: "Policies",
      description: "Company policies",
      iconClass: "bg-amber-100 text-amber-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/documents",
      section: "documents" as const,
      title: "Documents",
      description: "Files and resources",
      iconClass: "bg-sky-100 text-sky-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/onboarding",
      section: "onboarding" as const,
      title: "Onboarding",
      description: "Templates and progress",
      iconClass: "bg-indigo-100 text-indigo-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0v-8m0 8H7m10 0h-2M7 20H5m2 0v-8m0 8h2m8-12h-2M7 8h10"
        />
      ),
    },
    {
      href: "/admin/performance",
      section: "performance" as const,
      title: "Performance",
      description: "Goals, KPIs, and review cycles",
      iconClass: "bg-blue-100 text-blue-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 19V6m0 13l-4-4m4 4l4-4M5 12V8m14 4V4"
        />
      ),
    },
    {
      href: "/admin/academy",
      section: "academy" as const,
      title: "Academy",
      description: "Courses, assessments, and enrollments",
      iconClass: "bg-sky-100 text-sky-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118 17.5c0 .689.058 1.364.169 2.02L12 22l-6.169-2.48A12.08 12.08 0 016 17.5c0-2.211.6-4.282 1.84-6.922L12 14z"
        />
      ),
    },
    {
      href: "/admin/attendance",
      section: "attendance" as const,
      title: "Attendance",
      description: "Check-ins, check-outs, and overtime oversight",
      iconClass: "bg-lime-100 text-lime-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      href: "/admin/assets",
      section: "assets" as const,
      title: "Assets",
      description: "Inventory, assignments, and returns",
      iconClass: "bg-orange-100 text-orange-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
        />
      ),
    },
    {
      href: "/admin/surveys",
      section: "surveys" as const,
      title: "Surveys",
      description: "Engagement, pulse, and exit interviews",
      iconClass: "bg-teal-100 text-teal-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z"
        />
      ),
    },
    {
      href: "/admin/analytics",
      section: "analytics" as const,
      title: "Analytics",
      description: "Headcount and operational insights",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 19V6m4 13V10m4 9V4M7 19v-4"
        />
      ),
    },
    {
      href: "/admin/disciplinary",
      section: "disciplinary" as const,
      title: "Disciplinary",
      description: "Cases, actions, and outcomes",
      iconClass: "bg-rose-100 text-rose-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.73 3z"
        />
      ),
    },
    {
      href: "/admin/offboarding",
      section: "offboarding" as const,
      title: "Offboarding",
      description: "Exit workflow and final-day readiness",
      iconClass: "bg-slate-100 text-slate-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
        />
      ),
    },
    {
      href: "/admin/events",
      section: "events" as const,
      title: "Events",
      description: "Calendar management",
      iconClass: "bg-rose-100 text-rose-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ),
    },
    {
      href: "/admin/leave-requests",
      section: "leave_requests" as const,
      title: "Leave and Requests",
      description: "Review queues",
      iconClass: "bg-cyan-100 text-cyan-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10m-2 8H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z"
        />
      ),
    },
    {
      href: "/admin/settings",
      section: "settings" as const,
      title: "Settings",
      description: "Shared admin configuration",
      iconClass: "bg-slate-100 text-slate-700",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317a1 1 0 011.35-.936l1.314.526a1 1 0 00.948-.09l1.18-.787a1 1 0 011.49.465l.53 1.318a1 1 0 00.77.608l1.4.2a1 1 0 01.82 1.18l-.2 1.4a1 1 0 00.29.896l1.003 1.002a1 1 0 010 1.414l-1.003 1.002a1 1 0 00-.29.896l.2 1.4a1 1 0 01-.82 1.18l-1.4.2a1 1 0 00-.77.608l-.53 1.318a1 1 0 01-1.49.465l-1.18-.787a1 1 0 00-.948-.09l-1.314.526a1 1 0 01-1.35-.936v-1.333a1 1 0 00-.514-.874l-1.166-.648a1 1 0 01-.37-1.402l.774-1.1a1 1 0 000-1.15l-.774-1.1a1 1 0 01.37-1.402l1.166-.648a1 1 0 00.514-.874V4.317zM12 15a3 3 0 100-6 3 3 0 000 6z"
        />
      ),
    },
  ]
  const visibleCards = cards.filter((card) => canAccessAdminSection(session.user.role, card.section))

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Portal Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage content, documents, events, and review workflows from one place.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total staff" value={totalUsers} tone="slate" />
        <StatCard label="Active staff" value={activeUsers} tone="green" />
        <StatCard label="Pending approvals" value={pendingUsers} tone={pendingUsers > 0 ? "amber" : "slate"} />
        <StatCard label="Incomplete profiles" value={incompleteProfiles} tone={incompleteProfiles > 0 ? "rose" : "slate"} />
      </section>

      {pendingApprovals.length > 0 && (
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
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link key={`${card.section}:${card.href}`} href={card.href} className="panel block overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${card.iconClass}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {card.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function pendingAgeDays(createdAt: Date) {
  const diffMs = Math.max(0, Date.now() - createdAt.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function StatCard({
  label,
  value,
  tone,
}: {
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
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
