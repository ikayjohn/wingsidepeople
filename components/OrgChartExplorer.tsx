"use client"

import { useDeferredValue, useMemo, useState } from "react"
import OrgChartTree from "@/components/OrgChartTree"
import type { OrgNode } from "@/lib/org-chart"

function countNodes(nodes: OrgNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0)
}

function countLeaders(nodes: OrgNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.children.length > 0 ? 1 : 0) + countLeaders(node.children), 0)
}

function maxDepth(nodes: OrgNode[], depth = 1): number {
  if (nodes.length === 0) return depth - 1
  return Math.max(...nodes.map((node) => maxDepth(node.children, depth + 1)), depth)
}

function filterTree(nodes: OrgNode[], search: string, department: string): OrgNode[] {
  const normalizedSearch = search.trim().toLowerCase()

  return nodes.flatMap((node) => {
    const filteredChildren = filterTree(node.children, search, department)
    const matchesSearch =
      !normalizedSearch ||
      node.name.toLowerCase().includes(normalizedSearch) ||
      node.position?.toLowerCase().includes(normalizedSearch) ||
      node.department?.toLowerCase().includes(normalizedSearch)
    const matchesDepartment = !department || node.department === department
    const includeNode = (matchesSearch && matchesDepartment) || filteredChildren.length > 0

    if (!includeNode) return []

    return [
      {
        ...node,
        children: filteredChildren,
      },
    ]
  })
}

export default function OrgChartExplorer({
  tree,
  departments,
  totalPeople,
}: {
  tree: OrgNode[]
  departments: string[]
  totalPeople: number
}) {
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const deferredSearch = useDeferredValue(search)
  const filteredTree = useMemo(
    () => filterTree(tree, deferredSearch, department),
    [tree, deferredSearch, department]
  )

  const visiblePeople = countNodes(filteredTree)
  const visibleLeaders = countLeaders(filteredTree)
  const visibleDepth = maxDepth(filteredTree)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="People" value={String(totalPeople)} tone="blue" />
        <StatCard label="Visible now" value={String(visiblePeople)} tone="green" />
        <StatCard label="Team leads" value={String(visibleLeaders)} tone="amber" />
        <StatCard label="Levels" value={String(visibleDepth)} tone="rose" />
      </section>

      <section className="overflow-hidden rounded-[30px] border border-[#e4ebf4] bg-[linear-gradient(135deg,#ffffff_0%,#f7fafd_100%)] p-5 shadow-[0_20px_50px_rgba(148,163,184,0.12)]">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.7fr)]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, role, or department"
            className="rounded-2xl border border-[#d7e0ec] bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#c2d1e3] focus:ring-2 focus:ring-[#edf4ff]"
          />
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-2xl border border-[#d7e0ec] bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#c2d1e3] focus:ring-2 focus:ring-[#edf4ff]"
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#dde6f2] bg-[linear-gradient(180deg,#fdfefe_0%,#f6f9fc_100%)] p-4 shadow-[0_24px_60px_rgba(148,163,184,0.12)] sm:p-6">
        {filteredTree.length > 0 ? (
          <OrgChartTree
            tree={filteredTree}
          />
        ) : (
          <p className="text-center text-sm text-gray-500">
            No reporting lines match the current filters.
          </p>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "blue" | "green" | "amber" | "rose"
}) {
  const tones = {
    blue: "border-[#dbe7fb] bg-[#eff5ff] text-[#1e4c8f]",
    green: "border-[#d8efde] bg-[#eef9f1] text-[#1f6a42]",
    amber: "border-[#f4e3b5] bg-[#fff6dd] text-[#8a5b0a]",
    rose: "border-[#f5d7dc] bg-[#fff0f3] text-[#9a3046]",
  } as const

  return (
    <div className={`rounded-[24px] border px-4 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
