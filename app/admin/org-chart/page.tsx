import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import OrgChartExplorer from "@/components/OrgChartExplorer"
import { canAccessAdminSection } from "@/lib/rbac"
import { getOrgDepartments, getOrgStructure } from "@/lib/org-structure-data"
import { buildChartTree } from "@/lib/org-chart"

export default async function AdminOrgChartPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "org_chart")) redirect("/admin")

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      preferredName: true,
      position: true,
      department: true,
      image: true,
      email: true,
    },
    orderBy: { name: "asc" },
  })

  const [structure, departments] = await Promise.all([
    getOrgStructure(),
    getOrgDepartments(),
  ])

  const tree = buildChartTree(structure, users)

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Organization Chart</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Review reporting lines, team structure, role coverage, and vacant positions from the admin console.
        </p>
      </div>

      <div
        className="mx-auto"
        style={{ width: "95%", maxWidth: "95%" }}
      >
        {tree.length > 0 ? (
          <OrgChartExplorer tree={tree} departments={departments} totalPeople={users.length} />
        ) : (
          <div className="panel p-6">
            <p className="text-center text-sm text-gray-500">No organizational data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
