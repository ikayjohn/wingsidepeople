import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function AdminAnalyticsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "analytics")) redirect("/admin")
  if (!hasPrismaDelegates("hRRequest", "jobOpening", "asset")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Analytics runtime reload required" />
      </div>
    )
  }

  const [users, departments, leavePending, openHrRequests, openJobOpenings, byAssetStatus] = await Promise.all([
    prisma.user.findMany({
      where: { role: { notIn: ["admin", "super_admin"] } },
      select: {
        id: true,
        status: true,
        employmentType: true,
        workLocation: true,
      },
    }),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.leaveRequest.count({ where: { status: "pending" } }),
    prisma.hRRequest.count({ where: { status: "open" } }),
    prisma.jobOpening.count({ where: { status: "open" } }),
    prisma.asset.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ])

  const activeUsers = users.filter((user) => user.status === "active").length
  const pendingUsers = users.filter((user) => user.status === "pending_approval").length
  const totalLocations = new Set(users.map((user) => user.workLocation).filter(Boolean)).size

  const byEmploymentType = users.reduce<Record<string, number>>((acc, user) => {
    const key = user.employmentType || "unspecified"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const assetStatusMap = byAssetStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all
    return acc
  }, {})
  const employmentEntries = Object.entries(byEmploymentType) as [string, number][]
  const assetStatusEntries = Object.entries(assetStatusMap) as [string, number][]

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Insights</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">HR Analytics Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          A single view of workforce composition, workflow backlog, assets, and hiring activity.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total employees" value={users.length} tone="blue" />
        <StatCard label="Active" value={activeUsers} tone="green" />
        <StatCard label="Pending approvals" value={pendingUsers} tone="amber" />
        <StatCard label="Departments" value={departments.length} />
        <StatCard label="Locations" value={totalLocations} tone="rose" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Department Headcount" description="Current staff count by department.">
            <div className="space-y-4">
              {departments.length > 0 ? (
                departments.map((department) => (
                  <MetricBar key={department.id} label={department.name} value={department._count.users} total={Math.max(users.length, 1)} tone="blue" />
                ))
              ) : (
                <EmptyState label="No department data available." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Workforce Mix" description="Employment type and operational load indicators.">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {employmentEntries.map(([type, count]) => (
                  <MetricBar key={type} label={type.replaceAll("_", " ")} value={count} total={Math.max(users.length, 1)} tone="green" />
                ))}
              </div>
              <div className="space-y-4">
                <MetricBar label="Pending leave requests" value={leavePending} total={Math.max(leavePending, 1)} tone="gold" />
                <MetricBar label="Open HR requests" value={openHrRequests} total={Math.max(openHrRequests, 1)} tone="rose" />
                <MetricBar label="Open job openings" value={openJobOpenings} total={Math.max(openJobOpenings, 1)} tone="blue" />
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Asset Utilization" description="Asset status distribution.">
          <div className="space-y-4">
            {assetStatusEntries.length > 0 ? (
              assetStatusEntries.map(([status, count]) => (
                <MetricBar key={status} label={status} value={count} total={Math.max(assetStatusEntries.reduce((sum, [, value]) => sum + value, 0), 1)} tone="gold" />
              ))
            ) : (
              <EmptyState label="No asset analytics available yet." />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
