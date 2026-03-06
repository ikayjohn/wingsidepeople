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
          <Link key={card.href} href={card.href} className="panel block overflow-hidden p-6">
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
