import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import {
  createOffboardingChecklist,
  finalizeOffboarding,
  recordExitInterviewCompletion,
  updateOffboardingChecklist,
} from "@/app/admin/offboarding/actions"

type OffboardingItem = {
  label: string
  completed: boolean
}

function parseItems(itemsRaw: string): OffboardingItem[] {
  return JSON.parse(itemsRaw) as OffboardingItem[]
}

export default async function AdminOffboardingPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "offboarding")) redirect("/admin")
  if (!hasPrismaDelegates("offboardingChecklist", "assetAssignment", "survey")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Offboarding runtime reload required" />
      </div>
    )
  }

  const [employees, exitSurveys, offboardingTotals, inProgress, pendingHrApproval, completed, exitInterviewsLinked, reasonCounts, checklists] = await Promise.all([
    prisma.user.findMany({
      where: { status: "active", role: { notIn: ["admin", "super_admin"] } },
      select: { id: true, name: true, preferredName: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.survey.findMany({
      where: { type: "exit" },
      select: { id: true, title: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.offboardingChecklist.count(),
    prisma.offboardingChecklist.count({ where: { status: "in_progress" } }),
    prisma.offboardingChecklist.count({ where: { status: "pending_hr_approval" } }),
    prisma.offboardingChecklist.count({ where: { status: "completed" } }),
    prisma.offboardingChecklist.count({ where: { exitInterviewId: { not: null } } }),
    prisma.offboardingChecklist.groupBy({
      by: ["reason"],
      _count: { _all: true },
    }),
    prisma.offboardingChecklist.findMany({
      orderBy: { lastDay: "asc" },
      take: 12,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            department: true,
            position: true,
            assignedAssets: {
              where: { status: "active" },
              include: { asset: { select: { id: true, name: true, category: true, assetCode: true } } },
              orderBy: { assignedAt: "desc" },
            },
          },
        },
        initiatedBy: { select: { name: true, preferredName: true, email: true } },
        finalHrApprovedBy: { select: { name: true, preferredName: true, email: true } },
        exitInterview: { select: { id: true, title: true, isActive: true } },
      },
    }),
  ])

  const reasonCountMap = reasonCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.reason] = row._count._all
    return acc
  }, {})

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Transitions</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Offboarding</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Track final-day readiness, checklist completion, and exit interview coverage.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Offboarding cases" value={offboardingTotals} tone="blue" />
        <StatCard label="In progress" value={inProgress} tone="amber" />
        <StatCard label="Pending HR approval" value={pendingHrApproval} tone="rose" />
        <StatCard label="Completed" value={completed} tone="green" />
      </section>
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Exit interview linked" value={exitInterviewsLinked} tone="rose" />
        <StatCard label="Exit survey templates" value={exitSurveys.length} tone="blue" />
      </section>

      <section className="mb-6">
        <SectionCard title="Start Offboarding" description="Create a new offboarding checklist with exit survey linkage and clearance items.">
          <form action={createOffboardingChecklist} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="userId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.preferredName || employee.name || employee.email}</option>
              ))}
            </select>
            <select name="reason" defaultValue="resignation" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="resignation">Resignation</option>
              <option value="termination">Termination</option>
              <option value="contract_end">Contract end</option>
              <option value="retirement">Retirement</option>
            </select>
            <input name="lastDay" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="exitInterviewId" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">No exit interview linked yet</option>
              {exitSurveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}{survey.isActive ? " · active" : ""}
                </option>
              ))}
            </select>
            <textarea name="items" rows={4} defaultValue={"Collect ID card\nConfirm knowledge transfer\nDisable system access\nConfirm payroll closeout"} placeholder="One checklist item per line" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="notes" rows={3} placeholder="Notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Create offboarding checklist</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Upcoming Last Days" description="Current offboarding checklist queue.">
            <div className="space-y-3">
              {checklists.length > 0 ? (
                checklists.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    {(() => {
                      const checklistItems = parseItems(item.items)
                      const completedItems = checklistItems.filter((entry) => entry.completed).length
                      const totalItems = Math.max(checklistItems.length, 1)
                      const activeAssets = item.user.assignedAssets
                      const assetsReturned = activeAssets.length === 0

                      return (
                        <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.user.preferredName || item.user.name || item.user.email}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.reason.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.user.department || "No department"} • {item.user.position || "No role"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Last day {item.lastDay.toLocaleDateString()} • {item.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Clearance {completedItems}/{totalItems} complete
                      {" • "}
                      Assets {assetsReturned ? "returned" : `${activeAssets.length} pending`}
                    </p>
                    {item.initiatedBy ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Started by {item.initiatedBy.preferredName || item.initiatedBy.name || item.initiatedBy.email}
                      </p>
                    ) : null}
                    {item.exitInterview ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Exit interview: {item.exitInterview.title}
                        {" • "}
                        {item.exitInterviewCompletedAt ? `completed ${item.exitInterviewCompletedAt.toLocaleDateString()}` : "pending"}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700">No exit interview linked yet.</p>
                    )}
                    {item.finalHrApprovedAt ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        Final HR approval by {item.finalHrApprovedBy?.preferredName || item.finalHrApprovedBy?.name || item.finalHrApprovedBy?.email || "HR"} on {item.finalHrApprovedAt.toLocaleDateString()}
                      </p>
                    ) : null}
                    {item.notes ? <p className="mt-2 text-sm text-gray-600">{item.notes}</p> : null}
                    {activeAssets.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Pending Asset Return</p>
                        <div className="mt-2 space-y-1">
                          {activeAssets.map((assignment) => (
                            <p key={assignment.id} className="text-xs text-amber-900">
                              {assignment.asset.name} ({assignment.asset.category}) • {assignment.asset.assetCode || "No asset code"}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-700">
                        Assets cleared {item.assetsClearedAt ? `on ${item.assetsClearedAt.toLocaleDateString()}` : "and ready for final approval"}.
                      </p>
                    )}

                    <form action={updateOffboardingChecklist} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 md:grid-cols-2">
                      <input type="hidden" name="checklistId" value={item.id} />
                      <select name="status" defaultValue={item.status} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="in_progress">In progress</option>
                        <option value="pending_hr_approval">Pending HR approval</option>
                        <option value="completed">Completed</option>
                      </select>
                      <select name="exitInterviewId" defaultValue={item.exitInterviewId || ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="">No exit interview linked</option>
                        {exitSurveys.map((survey) => (
                          <option key={survey.id} value={survey.id}>
                            {survey.title}{survey.isActive ? " · active" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="space-y-2 md:col-span-2">
                        {checklistItems.map((checklistItem, index) => (
                          <label key={`${item.id}-${checklistItem.label}-${index}`} className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" name={`item_${index}`} defaultChecked={checklistItem.completed} />
                            <span>{checklistItem.label}</span>
                          </label>
                        ))}
                      </div>
                      <textarea name="notes" rows={3} defaultValue={item.notes || ""} placeholder="Checklist notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
                      <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Save checklist</button>
                    </form>

                    {item.exitInterviewId && !item.exitInterviewCompletedAt ? (
                      <form action={recordExitInterviewCompletion} className="mt-3">
                        <input type="hidden" name="checklistId" value={item.id} />
                        <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
                          Mark exit interview completed
                        </button>
                      </form>
                    ) : null}

                    {!item.finalHrApprovedAt ? (
                      <form action={finalizeOffboarding} className="mt-3 space-y-3 border-t border-gray-100 pt-4">
                        <input type="hidden" name="checklistId" value={item.id} />
                        <textarea
                          name="finalApprovalNotes"
                          rows={2}
                          placeholder="Final HR approval notes"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                          Final HR Approval
                        </button>
                      </form>
                    ) : null}
                        </>
                      )
                    })()}
                  </div>
                ))
              ) : (
                <EmptyState label="No offboarding cases in the system yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Reason Mix" description="Offboarding cases grouped by reason.">
          <div className="space-y-4">
            {["resignation", "termination", "contract_end", "retirement"].map((reason) => (
              <MetricBar
                key={reason}
                label={reason.replaceAll("_", " ")}
                value={reasonCountMap[reason] ?? 0}
                total={Math.max(offboardingTotals, 1)}
                tone={reason === "termination" ? "rose" : "gold"}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
