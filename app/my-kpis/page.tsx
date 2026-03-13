import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { calculateProgressPercentage, average, groupAverageByKey } from "@/lib/performance"
import { updateMyKpiProgress } from "@/app/my-kpis/actions"

export default async function MyKpisPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("employeeKpi", "performanceReview", "departmentKpi", "companyGoal")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Performance runtime reload required" />
      </div>
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, department: true },
  })

  const [kpis, reviews, departmentKpis, companyGoals, strategy] = await Promise.all([
    prisma.employeeKpi.findMany({
      where: { userId: session.user.id },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: {
        departmentKpi: {
          select: {
            title: true,
            currentValue: true,
            targetValue: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.performanceReview.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        reviewer: { select: { name: true, preferredName: true, email: true } },
      },
    }),
    prisma.departmentKpi.findMany({
      where: user?.department ? { department: { name: user.department } } : undefined,
      include: {
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.companyGoal.findMany({
      where: { status: "active" },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
    prisma.departmentStrategy.findFirst({
      where: user?.department ? { department: { name: user.department } } : undefined,
      include: { department: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
    }),
  ])

  const activeKpis = kpis.filter((kpi) => kpi.status === "active")
  const ratedKpis = kpis.filter((kpi) => kpi.managerRating != null)
  const averageManagerRating = ratedKpis.length
    ? (ratedKpis.reduce((sum, kpi) => sum + (kpi.managerRating ?? 0), 0) / ratedKpis.length).toFixed(1)
    : "0.0"

  const personalAverage = average(kpis.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue)))
  const departmentAverage = average(
    departmentKpis.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue))
  )
  const companyAverage = average(
    companyGoals.map((goal) => calculateProgressPercentage(goal.currentValue, goal.targetValue))
  )

  const departmentBreakdown = groupAverageByKey(
    departmentKpis,
    (kpi) => kpi.department.name,
    (kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
  )

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Performance</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">My KPIs</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Track your personal KPI progress, compare against department performance, and review current company goals.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Active KPIs" value={activeKpis.length} />
        <StatCard label="Personal progress" value={`${Math.round(personalAverage)}%`} tone="green" />
        <StatCard label="Department progress" value={`${Math.round(departmentAverage)}%`} tone="blue" />
        <StatCard label="Avg manager rating" value={averageManagerRating} tone="amber" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="My KPI Scorecard" description="Update your KPI progress and self-ratings.">
            <div className="space-y-4">
              {kpis.length > 0 ? (
                kpis.map((kpi) => {
                  const percentage = calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
                  return (
                    <div key={kpi.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{kpi.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {kpi.period}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {percentage}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {kpi.departmentKpi?.department?.name ? `${kpi.departmentKpi.department.name} • ` : ""}
                        {kpi.status.replaceAll("_", " ")}
                      </p>
                      {kpi.description ? <p className="mt-2 text-sm text-gray-600">{kpi.description}</p> : null}
                      <div className="mt-3">
                        <MetricBar label="Target achievement" value={percentage} total={100} tone="green" />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Target: {kpi.targetValue ?? "N/A"} {kpi.unit ?? ""}
                        {" • "}
                        Current: {kpi.currentValue ?? "N/A"} {kpi.unit ?? ""}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Self rating: {kpi.selfRating ?? "-"} • Manager rating: {kpi.managerRating ?? "-"}
                      </p>
                      <form action={updateMyKpiProgress} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input type="hidden" name="kpiId" value={kpi.id} />
                        <input
                          name="currentValue"
                          type="number"
                          step="0.01"
                          defaultValue={kpi.currentValue ?? ""}
                          placeholder="Current value"
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          name="selfRating"
                          type="number"
                          min="1"
                          max="5"
                          defaultValue={kpi.selfRating ?? ""}
                          placeholder="Self rating"
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
                          Update progress
                        </button>
                      </form>
                    </div>
                  )
                })
              ) : (
                <EmptyState label="No KPIs assigned yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent Reviews" description="Most recent performance review records.">
            <div className="space-y-3">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{review.period}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {review.type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Reviewer: {review.reviewer.preferredName || review.reviewer.name || review.reviewer.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {review.status.replaceAll("_", " ")} • Overall rating: {review.overallRating ?? "-"}
                    </p>
                    {review.comments ? <p className="mt-2 text-sm text-gray-600">{review.comments}</p> : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No performance reviews recorded yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Department Strategy" description="Current strategy document and focus areas for your department.">
            {strategy ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-200 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">{strategy.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {strategy.department.name} • Published {strategy.publishedAt.toLocaleDateString()}
                  </p>
                  {strategy.summary ? <p className="mt-2 text-sm text-gray-600">{strategy.summary}</p> : null}
                  <a
                    href={`/api/department-strategy/${strategy.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-brand-brown hover:text-brand-brown-light"
                  >
                    Open strategy document
                  </a>
                </div>
              </div>
            ) : (
              <EmptyState label="No department strategy document published yet." />
            )}
          </SectionCard>

          <SectionCard title="Department Performance" description="Latest department KPI progress.">
            <div className="space-y-4">
              {departmentBreakdown.length > 0 ? (
                departmentBreakdown.map((entry) => (
                  <MetricBar
                    key={entry.key}
                    label={entry.key}
                    value={Math.round(entry.average)}
                    total={100}
                    tone="blue"
                  />
                ))
              ) : (
                <EmptyState label="No department KPI data available yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Company Goals" description="Current company-wide priorities and progress.">
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Average company progress: {Math.round(companyAverage)}%</p>
              {companyGoals.length > 0 ? (
                companyGoals.map((goal) => {
                  const percentage = calculateProgressPercentage(goal.currentValue, goal.targetValue)
                  return (
                    <div key={goal.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {goal.currentValue ?? 0} / {goal.targetValue ?? 0} {goal.unit ?? ""}
                      </p>
                      <div className="mt-3">
                        <MetricBar label="Progress" value={percentage} total={100} tone="gold" />
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState label="No active company goals yet." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
