import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function DisciplinaryPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("disciplinaryCase")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Disciplinary runtime reload required" />
      </div>
    )
  }

  const cases = await prisma.disciplinaryCase.findMany({
    where: {
      employeeId: session.user.id,
      visibleToEmployee: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      managedBy: { select: { name: true, preferredName: true, email: true } },
      actions: {
        where: { visibleToEmployee: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  const openCases = cases.filter((item) => !["resolved", "closed"].includes(item.status))
  const resolvedCases = cases.filter((item) => ["resolved", "closed"].includes(item.status))

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Status Updates</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Disciplinary Updates</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          View disciplinary case status updates and any actions HR has made visible to you.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Visible cases" value={cases.length} tone="blue" />
        <StatCard label="Open cases" value={openCases.length} tone="amber" />
        <StatCard label="Resolved cases" value={resolvedCases.length} tone="green" />
      </section>

      <SectionCard title="Case Updates" description="Only employee-visible disciplinary updates appear here.">
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
                    {item.type.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Incident date {item.incidentDate.toLocaleDateString()} • Managed by {item.managedBy.preferredName || item.managedBy.name || item.managedBy.email}
                </p>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                {item.outcome ? (
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Management decision:</span> {item.outcome}
                  </p>
                ) : null}
                {item.appealNotes ? (
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Appeal notes:</span> {item.appealNotes}
                  </p>
                ) : null}

                {item.actions.length > 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visible actions</p>
                    <div className="mt-2 space-y-2">
                      {item.actions.map((action) => (
                        <div key={action.id} className="text-sm text-gray-700">
                          <p>{action.action.replaceAll("_", " ")}</p>
                          <p className="text-xs text-gray-500">
                            {action.createdAt.toLocaleDateString()}
                            {action.dueDate ? ` • due ${action.dueDate.toLocaleDateString()}` : ""}
                            {action.completedAt ? ` • completed ${action.completedAt.toLocaleDateString()}` : ""}
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
            <EmptyState label="No disciplinary updates have been shared with you." />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
