import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { createWorkLocation, updateWorkLocationState } from "@/app/admin/work-locations/actions"

export default async function AdminWorkLocationsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "work_locations")) redirect("/admin")
  if (!hasPrismaDelegates("workLocation")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Work locations runtime reload required" />
      </div>
    )
  }

  const [locations, activeCount, employeesByLocation] = await Promise.all([
    prisma.workLocation.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.workLocation.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ["workLocation"],
      where: { workLocation: { not: null }, status: "active" },
      _count: { _all: true },
    }),
  ])

  const employeeCounts = employeesByLocation.reduce<Record<string, number>>((acc, item) => {
    if (item.workLocation) acc[item.workLocation] = item._count._all
    return acc
  }, {})
  const totalAssignedEmployees = Object.values(employeeCounts).reduce((sum: number, count: number) => sum + count, 0)

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">HR Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Work Locations</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage the approved work locations used during employee signup and profile setup.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Configured" value={locations.length} tone="blue" />
        <StatCard label="Active" value={activeCount} tone="green" />
        <StatCard label="In use" value={Object.keys(employeeCounts).length} tone="amber" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Add Location" description="Create an option for signup and employee records.">
          <form action={createWorkLocation} className="space-y-3">
            <input name="name" required placeholder="Location name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="code" placeholder="Code (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="sortOrder" type="number" min="0" defaultValue="0" placeholder="Sort order" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Save work location</button>
          </form>
        </SectionCard>

        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Location Catalog" description="Active and inactive locations available to HR.">
            <div className="space-y-3">
              {locations.length > 0 ? (
                locations.map((location: { id: string; name: string; code: string | null; isActive: boolean; sortOrder: number }) => (
                  <div key={location.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{location.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${location.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {location.isActive ? "Active" : "Inactive"}
                          </span>
                          {location.code ? (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                              {location.code}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Sort order {location.sortOrder} • {employeeCounts[location.name] ?? 0} active employee{(employeeCounts[location.name] ?? 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <form action={updateWorkLocationState}>
                        <input type="hidden" name="id" value={location.id} />
                        <input type="hidden" name="isActive" value={location.isActive ? "false" : "true"} />
                        <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700">
                          {location.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState label="No work locations configured yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Usage Mix" description="Where active staff are currently assigned.">
            <div className="space-y-4">
              {locations.filter((location) => location.isActive).length > 0 ? (
                locations
                  .filter((location: { isActive: boolean }) => location.isActive)
                  .map((location: { id: string; name: string }) => (
                    <MetricBar
                      key={location.id}
                      label={location.name}
                      value={employeeCounts[location.name] ?? 0}
                      total={Math.max(totalAssignedEmployees, 1)}
                      tone="blue"
                    />
                  ))
              ) : (
                <EmptyState label="Activate at least one work location to start using this list." />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
