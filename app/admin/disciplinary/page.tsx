import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { addDisciplinaryAction, createDisciplinaryCase, updateDisciplinaryCase } from "@/app/admin/disciplinary/actions"

export default async function AdminDisciplinaryPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "disciplinary")) redirect("/admin")
  if (!hasPrismaDelegates("disciplinaryCase")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Disciplinary runtime reload required" />
      </div>
    )
  }

  const [employees, caseTotals, severityCounts, statusCounts, cases] = await Promise.all([
    prisma.user.findMany({
      where: { status: "active", role: { notIn: ["admin", "super_admin"] } },
      select: { id: true, name: true, preferredName: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.disciplinaryCase.count(),
    prisma.disciplinaryCase.groupBy({
      by: ["severity"],
      _count: { _all: true },
    }),
    prisma.disciplinaryCase.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.disciplinaryCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        employee: { select: { name: true, preferredName: true, email: true } },
        managedBy: { select: { name: true, preferredName: true, email: true } },
        actions: {
          select: { id: true, action: true, createdAt: true, visibleToEmployee: true, notes: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
  ])

  const severityCountMap = severityCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.severity] = row._count._all
    return acc
  }, {})
  const statusCountMap = statusCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all
    return acc
  }, {})
  const openCases = ["open", "investigation", "hearing", "appealed"].reduce((sum, status) => sum + (statusCountMap[status] ?? 0), 0)
  const seriousCases = (severityCountMap.serious ?? 0) + (severityCountMap.gross ?? 0)

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Casework</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Disciplinary Tracking</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Record warnings, investigations, suspensions, management actions, and employee-visible case updates.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Cases tracked" value={caseTotals} tone="blue" />
        <StatCard label="Open flow" value={openCases} tone="amber" />
        <StatCard label="Serious / gross" value={seriousCases} tone="rose" />
        <StatCard label="Resolved" value={(statusCountMap.resolved ?? 0) + (statusCountMap.closed ?? 0)} tone="green" />
      </section>

      <section className="mb-6">
        <SectionCard title="Open New Case" description="Log a new disciplinary case for an employee.">
          <form action={createDisciplinaryCase} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="employeeId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.preferredName || employee.name || employee.email}</option>
              ))}
            </select>
            <input name="incidentDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="title" required placeholder="Case title" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="type" defaultValue="written_warning" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="verbal_warning">Verbal warning</option>
              <option value="written_warning">Written warning</option>
              <option value="suspension">Suspension</option>
              <option value="termination">Termination</option>
              <option value="pip">PIP</option>
            </select>
            <select name="severity" defaultValue="minor" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="serious">Serious</option>
              <option value="gross">Gross</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="visibleToEmployee" />
              Visible to employee
            </label>
            <textarea name="description" rows={4} required placeholder="Incident description" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create case</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Active Cases" description="Recent disciplinary matters, decisions, and employee-visible actions.">
            <div className="space-y-4">
              {cases.length > 0 ? (
                cases.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.status}
                      </span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        {item.severity}
                      </span>
                      {item.visibleToEmployee ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          Employee visible
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.employee.preferredName || item.employee.name || item.employee.email} • Managed by {item.managedBy.preferredName || item.managedBy.name || item.managedBy.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Incident {item.incidentDate.toLocaleDateString()} • {item.type.replaceAll("_", " ")}
                    </p>
                    {item.description ? <p className="mt-2 text-sm text-gray-600">{item.description}</p> : null}
                    {item.outcome ? <p className="mt-2 text-sm text-gray-600">Outcome: {item.outcome}</p> : null}

                    <form action={updateDisciplinaryCase} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input type="hidden" name="caseId" value={item.id} />
                      <select name="status" defaultValue={item.status} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="open">Open</option>
                        <option value="investigation">Investigation</option>
                        <option value="hearing">Hearing</option>
                        <option value="resolved">Resolved</option>
                        <option value="appealed">Appealed</option>
                        <option value="closed">Closed</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="visibleToEmployee" defaultChecked={item.visibleToEmployee} />
                        Visible to employee
                      </label>
                      <textarea name="outcome" rows={2} defaultValue={item.outcome || ""} placeholder="Management decision / outcome" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
                      <textarea name="appealNotes" rows={2} defaultValue={item.appealNotes || ""} placeholder="Appeal notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
                      <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Update case</button>
                    </form>

                    <form action={addDisciplinaryAction} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 border-t border-gray-100 pt-4">
                      <input type="hidden" name="caseId" value={item.id} />
                      <select name="action" defaultValue="management_decision_recorded" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="verbal_warning_issued">Verbal warning issued</option>
                        <option value="written_warning_issued">Written warning issued</option>
                        <option value="meeting_scheduled">Meeting scheduled</option>
                        <option value="pip_started">PIP started</option>
                        <option value="suspension_served">Suspension served</option>
                        <option value="hearing_date_set">Hearing date set</option>
                        <option value="investigation_opened">Investigation opened</option>
                        <option value="management_decision_recorded">Management decision recorded</option>
                      </select>
                      <input name="dueDate" type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="visibleToEmployee" />
                        Visible to employee
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="markCompleted" />
                        Mark completed
                      </label>
                      <textarea name="notes" rows={3} placeholder="Action notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
                      <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Add action</button>
                    </form>

                    {item.actions.length > 0 ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent actions</p>
                        <div className="mt-2 space-y-2">
                          {item.actions.map((action) => (
                            <div key={action.id} className="text-sm text-gray-700">
                              <p>{action.action.replaceAll("_", " ")}</p>
                              <p className="text-xs text-gray-500">
                                {action.createdAt.toLocaleDateString()}
                                {action.visibleToEmployee ? " • employee visible" : ""}
                              </p>
                              {action.notes ? <p className="text-xs text-gray-500">{action.notes}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No disciplinary cases logged yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Case Severity Mix" description="How recent cases are distributed by severity.">
          <div className="space-y-4">
            {["minor", "moderate", "serious", "gross"].map((severity) => (
              <MetricBar
                key={severity}
                label={severity}
                value={severityCountMap[severity] ?? 0}
                total={Math.max(caseTotals, 1)}
                tone={severity === "gross" || severity === "serious" ? "rose" : "gold"}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
