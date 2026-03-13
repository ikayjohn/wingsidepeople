import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import OrgChartExplorer from "@/components/OrgChartExplorer"

export type OrgNode = {
  id: string
  name: string
  position: string | null
  department: string | null
  image: string | null
  reportsCount: number
  children: OrgNode[]
}

function buildTree(
  users: {
    id: string
    name: string | null
    preferredName: string | null
    position: string | null
    department: string | null
    image: string | null
    managerId: string | null
  }[]
): OrgNode[] {
  const byManager = new Map<string | null, typeof users>()
  for (const u of users) {
    const key = u.managerId ?? "__root__"
    const list = byManager.get(key) ?? []
    list.push(u)
    byManager.set(key, list)
  }

  function countDescendants(parentId: string): number {
    const directReports = byManager.get(parentId) ?? []
    return directReports.reduce((sum, report) => sum + 1 + countDescendants(report.id), 0)
  }

  function build(parentId: string | null): OrgNode[] {
    const children = byManager.get(parentId ?? "__root__") ?? []
    return children.map((u) => ({
      id: u.id,
      name: u.preferredName || u.name || "Unknown",
      position: u.position,
      department: u.department,
      image: u.image,
      reportsCount: countDescendants(u.id),
      children: build(u.id),
    }))
  }

  // Root nodes: users whose managerId is null OR whose managerId doesn't exist in our user set
  const userIds = new Set(users.map((u) => u.id))
  const roots: OrgNode[] = []

  for (const u of users) {
    if (u.managerId === null || !userIds.has(u.managerId)) {
      roots.push({
        id: u.id,
        name: u.preferredName || u.name || "Unknown",
        position: u.position,
        department: u.department,
        image: u.image,
        reportsCount: countDescendants(u.id),
        children: build(u.id),
      })
    }
  }

  return roots
}

export default async function OrgChartPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      preferredName: true,
      position: true,
      department: true,
      image: true,
      managerId: true,
    },
    orderBy: { name: "asc" },
  })

  const tree = buildTree(users)
  const departments = Array.from(
    new Set(users.map((user) => user.department).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b))

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
        <p className="mt-2 text-gray-600">
          Explore reporting lines, department clusters, and team structure across the company.
        </p>
      </div>

      {tree.length > 0 ? (
        <OrgChartExplorer tree={tree} departments={departments} totalPeople={users.length} />
      ) : (
        <div className="panel p-6">
          <p className="text-center text-sm text-gray-500">
            No organizational data available.
          </p>
        </div>
      )}
    </div>
  )
}
