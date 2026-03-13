import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import { assignAsset, createAsset, returnAsset, updateAssetStatus } from "@/app/admin/assets/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"

export default async function AdminAssetsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "assets")) redirect("/admin")
  if (!hasPrismaDelegates("asset", "assetAssignment")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Assets runtime reload required" />
      </div>
    )
  }

  const [assetTotals, availableCount, assignedCount, returnedCount, maintenanceCount, lostCount, damagedCount, assets, assignments] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: "available" } }),
    prisma.asset.count({ where: { status: "assigned" } }),
    prisma.asset.count({ where: { status: "returned" } }),
    prisma.asset.count({ where: { status: "maintenance" } }),
    prisma.asset.count({ where: { status: "lost" } }),
    prisma.asset.count({ where: { status: "damaged" } }),
    prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.assetAssignment.findMany({
      orderBy: { assignedAt: "desc" },
      take: 15,
      include: {
        asset: { select: { name: true, category: true, assetCode: true } },
        assignedTo: { select: { name: true, preferredName: true, email: true, department: true } },
      },
    }),
  ])
  const employees = await prisma.user.findMany({
    where: { status: "active", role: { notIn: ["admin", "super_admin"] } },
    select: { id: true, name: true, preferredName: true, email: true, department: true },
    orderBy: { name: "asc" },
  })

  const byStatus = {
    available: availableCount,
    assigned: assignedCount,
    returned: returnedCount,
    maintenance: maintenanceCount,
    lost: lostCount,
    damaged: damagedCount,
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Asset Control</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Asset Register</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Track company property, assignments, expected returns, and asset condition across the business.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-6">
        <StatCard label="Registered" value={assetTotals} tone="blue" />
        <StatCard label="Available" value={availableCount} tone="green" />
        <StatCard label="Assigned" value={assignedCount} tone="amber" />
        <StatCard label="Returned" value={returnedCount} />
        <StatCard label="Maintenance" value={maintenanceCount} tone="rose" />
        <StatCard label="Lost/Damaged" value={lostCount + damagedCount} tone="rose" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Register Asset" description="Create a new asset record.">
          <form action={createAsset} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input name="assetCode" placeholder="Asset ID / Tag" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="name" required placeholder="Asset name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="category" required placeholder="Category" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="serialNumber" placeholder="Serial number" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="location" placeholder="Location" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="condition" defaultValue="good" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
              <option value="retired">Retired</option>
            </select>
            <textarea name="notes" rows={3} placeholder="Asset notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Register asset</button>
          </form>
        </SectionCard>

        <SectionCard title="Assign Asset" description="Allocate an available or returned asset to an employee.">
          <form action={assignAsset} className="grid grid-cols-1 gap-3">
            <select name="assetId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select asset</option>
              {assets.filter((asset) => ["available", "returned"].includes(asset.status)).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode || asset.id} · {asset.name} ({asset.category})
                </option>
              ))}
            </select>
            <select name="assignedToId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.preferredName || employee.name || employee.email}{employee.department ? ` · ${employee.department}` : ""}
                </option>
              ))}
            </select>
            <input name="expectedReturnDate" type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea name="notes" rows={3} placeholder="Assignment notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Assign asset</button>
          </form>
        </SectionCard>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="Asset Register" description="Latest items in the company asset register.">
            <div className="space-y-3">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <div key={asset.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {asset.category}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {asset.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Asset ID: {asset.assetCode || "Not assigned"} • Serial: {asset.serialNumber || "Not recorded"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Condition: {asset.condition} • Location: {asset.location || "No location"}
                    </p>
                    {asset.notes ? <p className="mt-2 text-sm text-gray-600">{asset.notes}</p> : null}
                    <form action={updateAssetStatus} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <input type="hidden" name="assetId" value={asset.id} />
                      <select name="status" defaultValue={asset.status} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="returned">Returned</option>
                        <option value="lost">Lost</option>
                        <option value="damaged">Damaged</option>
                        <option value="maintenance">Under maintenance</option>
                        <option value="retired">Retired</option>
                      </select>
                      <select name="condition" defaultValue={asset.condition} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="damaged">Damaged</option>
                        <option value="retired">Retired</option>
                      </select>
                      <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">Update asset</button>
                    </form>
                  </div>
                ))
              ) : (
                <EmptyState label="No assets recorded yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Latest Assignments" description="Recent asset handovers and returns.">
            <div className="space-y-3">
              {assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {assignment.asset.assetCode || assignment.asset.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {assignment.asset.name} • {assignment.asset.category} • {assignment.status}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {assignment.assignedTo.preferredName || assignment.assignedTo.name || assignment.assignedTo.email}
                      {" • "}
                      {assignment.departmentSnapshot || assignment.assignedTo.department || "No department"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Issued {assignment.assignedAt.toLocaleDateString()}
                      {assignment.expectedReturnDate ? ` • Expected return ${assignment.expectedReturnDate.toLocaleDateString()}` : ""}
                    </p>
                    {assignment.status === "active" ? (
                      <form action={returnAsset} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input type="hidden" name="assetId" value={assignment.assetId} />
                        <select name="returnCondition" defaultValue="good" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="damaged">Damaged</option>
                        </select>
                        <select name="nextStatus" defaultValue="available" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">
                          <option value="available">Available</option>
                          <option value="returned">Returned</option>
                          <option value="maintenance">Under maintenance</option>
                          <option value="damaged">Damaged</option>
                        </select>
                        <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-brown md:col-span-2">
                          Mark returned
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState label="No asset assignments recorded yet." />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Asset Status Mix" description="Distribution across asset lifecycle states.">
          <div className="space-y-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <MetricBar key={status} label={status} value={count} total={Math.max(assetTotals, 1)} tone="gold" />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
