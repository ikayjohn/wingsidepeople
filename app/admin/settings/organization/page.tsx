import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminSection } from "@/lib/rbac"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { prisma } from "@/lib/prisma"
import {
  backfillLegacyAvatarUrls,
  createOrganizationRole,
  deleteOrganizationRole,
  seedDefaultOrganizationRoles,
  updateOrganizationRole,
} from "@/app/admin/settings/actions"

export default async function AdminOrganizationSettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "settings")) redirect("/admin")

  if (!hasPrismaDelegates("orgRole")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Organization structure migration required" />
      </div>
    )
  }

  const roles = await prisma.orgRole.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      department: true,
      parentRoleId: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { childRoles: true } },
    },
  })

  const users = await prisma.user.findMany({
    where: { status: { not: "exited" } },
    select: { department: true, position: true },
  })

  const roleOccupancy = new Map<string, number>()
  for (const user of users) {
    const key = `${user.department || ""}::${user.position || ""}`
    roleOccupancy.set(key, (roleOccupancy.get(key) ?? 0) + 1)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Organization Structure</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage departments, reporting parents, role order, and cleanup tasks that affect signup, profile editing, manager recommendations, and the org chart.
        </p>
      </section>

      <section className="panel mb-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Maintenance</h2>
            <p className="mt-1 text-sm text-gray-500">Seed the current fallback structure or backfill legacy avatar URLs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={seedDefaultOrganizationRoles}>
              <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
                Seed Default Roles
              </button>
            </form>
            <form action={backfillLegacyAvatarUrls}>
              <button type="submit" className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
                Backfill Avatar URLs
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="panel mb-6 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Add Role</h2>
        <form action={createOrganizationRole} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <input name="title" placeholder="Role title" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="department" placeholder="Department" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="parentRoleId" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">No parent role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.title} • {role.department}</option>
            ))}
          </select>
          <input name="sortOrder" type="number" min="0" defaultValue={roles.length} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <div className="md:col-span-5">
            <button type="submit" className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown">
              Add Role
            </button>
          </div>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Managed Roles ({roles.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {roles.map((role) => {
            const occupancyKey = `${role.department}::${role.title}`
            const assignedCount = roleOccupancy.get(occupancyKey) ?? 0

            return (
              <div key={role.id} className="px-6 py-5">
                <form action={updateOrganizationRole} className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <input type="hidden" name="roleId" value={role.id} />
                  <input name="title" defaultValue={role.title} required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <input name="department" defaultValue={role.department} required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <select name="parentRoleId" defaultValue={role.parentRoleId || ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">No parent role</option>
                    {roles.filter((item) => item.id !== role.id).map((item) => (
                      <option key={item.id} value={item.id}>{item.title} • {item.department}</option>
                    ))}
                  </select>
                  <input name="sortOrder" type="number" min="0" defaultValue={role.sortOrder} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">
                    <input type="checkbox" name="isActive" defaultChecked={role.isActive} />
                    Active
                  </label>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{assignedCount} assigned</span>
                    <span>•</span>
                    <span>{role._count.childRoles} child role(s)</span>
                  </div>
                  <p className="md:col-span-6 text-xs text-gray-500">
                    Saving department/title changes will immediately realign {assignedCount} active employee{assignedCount === 1 ? "" : "s"} currently assigned to this role.
                  </p>
                  <div className="md:col-span-6 flex flex-wrap gap-2">
                    <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
                      Save Role
                    </button>
                  </div>
                </form>
                <form action={deleteOrganizationRole} className="mt-2">
                  <input type="hidden" name="roleId" value={role.id} />
                  <button type="submit" className="text-sm font-medium text-red-700">
                    Delete role
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
