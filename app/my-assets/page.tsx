import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function MyAssetsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("assetAssignment")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Assets runtime reload required" />
      </div>
    )
  }

  const assignments = await prisma.assetAssignment.findMany({
    where: { assignedToId: session.user.id },
    orderBy: { assignedAt: "desc" },
    take: 12,
    include: {
      asset: true,
      assignedBy: { select: { name: true, preferredName: true, email: true } },
    },
  })

  const activeAssets = assignments.filter((assignment) => assignment.status === "active")
  const returnedAssets = assignments.filter((assignment) => assignment.status === "returned")

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Assets</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">My Assets</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          View company property issued to you, expected return dates, and your asset handover history.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Assigned now" value={activeAssets.length} tone="blue" />
        <StatCard label="Returned" value={returnedAssets.length} />
        <StatCard label="Due back soon" value={activeAssets.filter((assignment) => assignment.expectedReturnDate).length} tone="amber" />
        <StatCard label="Total history" value={assignments.length} tone="green" />
      </section>

      <SectionCard title="Asset Assignment History" description="Latest handover and return entries on your profile.">
        <div className="space-y-3">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{assignment.asset.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {assignment.asset.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      assignment.status === "active"
                        ? "bg-sky-50 text-sky-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Asset ID: {assignment.asset.assetCode || "Not assigned"} • Serial: {assignment.asset.serialNumber || "Not recorded"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Condition: {assignment.asset.condition} • Current asset status: {assignment.asset.status}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Assigned {assignment.assignedAt.toLocaleDateString()} by {assignment.assignedBy.preferredName || assignment.assignedBy.name || assignment.assignedBy.email}
                </p>
                {assignment.expectedReturnDate ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Expected return: {assignment.expectedReturnDate.toLocaleDateString()}
                  </p>
                ) : null}
                {assignment.returnedAt ? (
                  <p className="mt-1 text-xs text-emerald-600">
                    Returned {assignment.returnedAt.toLocaleDateString()} • {assignment.returnCondition || "Condition not noted"}
                  </p>
                ) : null}
                {assignment.notes ? <p className="mt-2 text-sm text-gray-600">{assignment.notes}</p> : null}
              </div>
            ))
          ) : (
            <EmptyState label="No asset assignments found on your profile." />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
