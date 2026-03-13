import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection, normalizeRole } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import {
  createDepartmentKpi,
  createEmployeeKpi,
  createGoal,
  createPerformanceReview,
  uploadDepartmentStrategy,
  updateDepartmentKpiProgress,
  updateEmployeeKpiProgress,
  updateGoalProgress,
} from "@/app/admin/performance/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { average, calculateProgressPercentage, groupAverageByKey } from "@/lib/performance"

export default async function AdminPerformancePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "performance")) redirect("/admin")
  if (!hasPrismaDelegates("companyGoal", "departmentKpi", "employeeKpi", "performanceReview")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Performance runtime reload required" />
      </div>
    )
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, department: true },
  })
  if (!actor) redirect("/login")

  const role = normalizeRole(actor.role)
  const canManageCompanyGoals = role === "hr" || role === "admin" || role === "super_admin"

  const departmentFilter = role === "manager" && actor.department
    ? { department: { name: actor.department } }
    : undefined
  const employeeFilter = role === "manager"
    ? {
        OR: [
          { managerId: actor.id },
          ...(actor.department ? [{ department: actor.department }] : []),
        ],
        status: "active" as const,
        role: { notIn: ["admin", "super_admin"] },
      }
    : {
        status: "active" as const,
        role: { notIn: ["admin", "super_admin"] },
      }

  const [goals, departmentKpis, employeeKpis, reviews, departments, employees, strategies] = await Promise.all([
    prisma.companyGoal.findMany({
      orderBy: { endDate: "asc" },
      take: 8,
    }),
    prisma.departmentKpi.findMany({
      where: departmentFilter,
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        department: { select: { name: true } },
        companyGoal: { select: { title: true } },
      },
    }),
    prisma.employeeKpi.findMany({
      where: role === "manager"
        ? {
            user: {
              OR: [
                { managerId: actor.id },
                ...(actor.department ? [{ department: actor.department }] : []),
              ],
            },
          }
        : undefined,
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 16,
      include: {
        user: { select: { name: true, preferredName: true, email: true, department: true } },
        departmentKpi: {
          select: {
            title: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.performanceReview.findMany({
      where: role === "manager"
        ? {
            user: {
              OR: [
                { managerId: actor.id },
                ...(actor.department ? [{ department: actor.department }] : []),
              ],
            },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, preferredName: true, email: true } },
        reviewer: { select: { name: true, preferredName: true, email: true } },
      },
    }),
    prisma.department.findMany({
      where: role === "manager" && actor.department ? { name: actor.department } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: employeeFilter,
      select: { id: true, name: true, preferredName: true, email: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.departmentStrategy.findMany({
      where: role === "manager" && actor.department ? { department: { name: actor.department } } : undefined,
      include: {
        department: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
  ])

  const goalAverage = average(goals.map((goal) => calculateProgressPercentage(goal.currentValue, goal.targetValue)))
  const departmentAverage = average(
    departmentKpis.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue))
  )
  const employeeAverage = average(
    employeeKpis.map((kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue))
  )
  const avgReviewRating = average(reviews.map((review) => review.overallRating))

  const departmentDashboard = groupAverageByKey(
    employeeKpis,
    (kpi) => kpi.user.department || "Unassigned",
    (kpi) => calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
  )

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Execution Layer</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Performance & KPIs</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Define goals, assign KPIs, monitor team execution, and review department performance dashboards.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Company goal progress" value={`${Math.round(goalAverage)}%`} tone="blue" />
        <StatCard label="Department progress" value={`${Math.round(departmentAverage)}%`} tone="green" />
        <StatCard label="Employee KPI progress" value={`${Math.round(employeeAverage)}%`} tone="amber" />
        <StatCard label="Avg review rating" value={avgReviewRating.toFixed(1)} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {canManageCompanyGoals ? (
          <SectionCard title="Create Company Goal" description="Add a new company-level goal.">
            <form action={createGoal} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input name="title" required placeholder="Goal title" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
              <input name="targetValue" type="number" step="0.01" placeholder="Target value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input name="unit" placeholder="Unit" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input name="startDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input name="endDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create goal</button>
            </form>
          </SectionCard>
        ) : (
          <SectionCard title="Company Goals" description="Managers can view company goals but only HR/admin can create them.">
            <p className="text-sm text-gray-500">Company goal creation is restricted to HR and admin roles.</p>
          </SectionCard>
        )}

        <SectionCard title="Create Department KPI" description="Add a KPI for a department.">
          <form action={createDepartmentKpi} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="departmentId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <select name="companyGoalId" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Link to company goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
            <input name="title" required placeholder="KPI title" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="description" rows={2} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <input name="targetValue" type="number" step="0.01" placeholder="Target value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="unit" placeholder="Unit" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="startDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="endDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create department KPI</button>
          </form>
        </SectionCard>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Assign Employee KPI" description="Add an individual KPI to an employee.">
          <form action={createEmployeeKpi} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="userId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.preferredName || employee.name || employee.email}</option>
              ))}
            </select>
            <select name="departmentKpiId" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Link to department KPI</option>
              {departmentKpis.map((kpi) => (
                <option key={kpi.id} value={kpi.id}>{kpi.title}</option>
              ))}
            </select>
            <input name="title" required placeholder="KPI title" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="description" rows={2} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <input name="period" required placeholder="2026-Q1" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="targetValue" type="number" step="0.01" placeholder="Target value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="unit" placeholder="Unit" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Assign KPI</button>
          </form>
        </SectionCard>

        <SectionCard title="Submit Review" description="Create or update a performance review for an employee.">
          <form action={createPerformanceReview} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="userId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.preferredName || employee.name || employee.email}</option>
              ))}
            </select>
            <input name="period" required placeholder="2026-Q1" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="type" defaultValue="quarterly" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="quarterly">Quarterly</option>
              <option value="mid_year">Mid year</option>
              <option value="annual">Annual</option>
              <option value="probation">Probation</option>
            </select>
            <input name="overallRating" type="number" min="1" max="5" placeholder="Overall rating" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="strengths" rows={2} placeholder="Strengths" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="improvements" rows={2} placeholder="Areas for improvement" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="goals" rows={2} placeholder="Next-cycle goals" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="comments" rows={3} placeholder="Comments" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Submit review</button>
          </form>
        </SectionCard>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Department Strategy" description="Upload strategy documents and summaries for departments.">
          <form action={uploadDepartmentStrategy} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="departmentId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <input name="title" required placeholder="Strategy title" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="summary" rows={3} placeholder="Summary or focus areas" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <input name="file" type="file" required className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Upload strategy</button>
          </form>
        </SectionCard>

        <SectionCard title="Published Strategy Docs" description="Most recent department strategy uploads.">
          <div className="space-y-3">
            {strategies.length > 0 ? (
              strategies.map((strategy) => (
                <div key={strategy.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">{strategy.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {strategy.department.name} • {strategy.publishedAt.toLocaleDateString()}
                  </p>
                  {strategy.summary ? <p className="mt-2 text-sm text-gray-600">{strategy.summary}</p> : null}
                  <a
                    href={`/api/department-strategy/${strategy.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-brand-brown hover:text-brand-brown-light"
                  >
                    Open strategy document
                  </a>
                </div>
              ))
            ) : (
              <EmptyState label="No strategy documents uploaded yet." />
            )}
          </div>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Company Goals Dashboard" description="Update goal progress and review active priorities.">
            <div className="space-y-4">
              {goals.length > 0 ? (
                goals.map((goal) => {
                  const percentage = calculateProgressPercentage(goal.currentValue, goal.targetValue)
                  return (
                    <div key={goal.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {goal.status}
                        </span>
                      </div>
                      {goal.description ? <p className="mt-2 text-sm text-gray-600">{goal.description}</p> : null}
                      <div className="mt-3">
                        <MetricBar label="Progress" value={percentage} total={100} tone="blue" />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {goal.currentValue ?? 0} / {goal.targetValue ?? 0} {goal.unit ?? ""} • Ends {goal.endDate.toLocaleDateString()}
                      </p>
                      {canManageCompanyGoals ? (
                        <form action={updateGoalProgress} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <input type="hidden" name="goalId" value={goal.id} />
                          <input name="currentValue" type="number" step="0.01" defaultValue={goal.currentValue ?? ""} placeholder="Current value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                          <select name="status" defaultValue={goal.status} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Update goal</button>
                        </form>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <EmptyState label="No company goals defined yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Department & Team KPIs" description="Track department targets and employee KPI execution.">
            <div className="space-y-4">
              {departmentKpis.length > 0 ? (
                departmentKpis.map((kpi) => {
                  const percentage = calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
                  return (
                    <div key={kpi.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{kpi.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {kpi.department.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {kpi.companyGoal?.title ? `Linked to ${kpi.companyGoal.title} • ` : ""}
                        {kpi.status.replaceAll("_", " ")}
                      </p>
                      <div className="mt-3">
                        <MetricBar label="Progress" value={percentage} total={100} tone="green" />
                      </div>
                      <form action={updateDepartmentKpiProgress} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input type="hidden" name="departmentKpiId" value={kpi.id} />
                        <input name="currentValue" type="number" step="0.01" defaultValue={kpi.currentValue ?? ""} placeholder="Current value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        <select name="status" defaultValue={kpi.status} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Update KPI</button>
                      </form>
                    </div>
                  )
                })
              ) : (
                <EmptyState label="No department KPIs available." />
              )}
            </div>

            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              {employeeKpis.length > 0 ? (
                employeeKpis.map((kpi) => {
                  const percentage = calculateProgressPercentage(kpi.currentValue, kpi.targetValue)
                  return (
                    <div key={kpi.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">{kpi.user.preferredName || kpi.user.name || kpi.user.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {kpi.title} • {kpi.period} • {kpi.user.department || "Unassigned"}
                      </p>
                      <div className="mt-3">
                        <MetricBar label="KPI progress" value={percentage} total={100} tone="gold" />
                      </div>
                      <form action={updateEmployeeKpiProgress} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input type="hidden" name="kpiId" value={kpi.id} />
                        <input name="currentValue" type="number" step="0.01" defaultValue={kpi.currentValue ?? ""} placeholder="Current value" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        <input name="selfRating" type="number" min="1" max="5" defaultValue={kpi.selfRating ?? ""} placeholder="Self rating" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Update employee KPI</button>
                      </form>
                    </div>
                  )
                })
              ) : (
                <EmptyState label="No employee KPIs available." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent Performance Reviews" description="Latest manager and HR review activity.">
            <div className="space-y-3">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {review.user.preferredName || review.user.name || review.user.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {review.period} • {review.type.replaceAll("_", " ")} • Reviewer: {review.reviewer.preferredName || review.reviewer.name || review.reviewer.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {review.status.replaceAll("_", " ")} • Overall rating: {review.overallRating ?? "-"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No performance reviews recorded yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Department Dashboard" description="Average team KPI progress by department.">
            <div className="space-y-4">
              {departmentDashboard.length > 0 ? (
                departmentDashboard.map((entry) => (
                  <MetricBar
                    key={entry.key}
                    label={entry.key}
                    value={Math.round(entry.average)}
                    total={100}
                    tone="green"
                  />
                ))
              ) : (
                <EmptyState label="No department dashboard data available." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
