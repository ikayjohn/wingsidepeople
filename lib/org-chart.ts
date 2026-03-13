import { normalizeUserImage } from "@/lib/avatar"
import type { OrgStructureNode } from "@/lib/org-structure"

export type OrgNode = {
  id: string
  name: string
  position: string | null
  department: string | null
  image: string | null
  reportsCount: number
  headcount: number
  occupantSummary: string | null
  children: OrgNode[]
}

type OrgChartUser = {
  id: string
  name: string | null
  preferredName: string | null
  position: string | null
  department: string | null
  image: string | null
  email: string
}

function buildOccupantKey(department: string | null, position: string | null) {
  return `${(department || "").trim().toLowerCase()}::${(position || "").trim().toLowerCase()}`
}

function countDescendants(nodes: OrgStructureNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countDescendants(node.children ?? []), 0)
}

export function buildChartTree(structure: OrgStructureNode[], users: OrgChartUser[]): OrgNode[] {
  const byRole = new Map<string, OrgChartUser[]>()

  for (const user of users) {
    const key = buildOccupantKey(user.department, user.position)
    if (key === "::") continue
    const list = byRole.get(key) ?? []
    list.push({
      ...user,
      image: normalizeUserImage(user.image, user.id),
    })
    byRole.set(key, list)
  }

  function build(nodes: OrgStructureNode[]): OrgNode[] {
    return nodes.map((node) => {
      const occupants = byRole.get(buildOccupantKey(node.department, node.title)) ?? []
      const children = build(node.children ?? [])
      const occupantNames = occupants.map((person) => person.preferredName || person.name || person.email)

      return {
        id: node.id,
        name: node.title,
        position: occupantNames.length > 0 ? occupantNames.slice(0, 2).join(", ") : "Vacant role",
        department: node.department,
        image: occupants[0]?.image || null,
        reportsCount: countDescendants(node.children ?? []),
        headcount: occupants.length,
        occupantSummary:
          occupants.length === 0
            ? "Vacant role"
            : occupants.length === 1
              ? `Filled by ${occupantNames[0]}`
              : `${occupants.length} employees assigned`,
        children,
      }
    })
  }

  return build(structure)
}
