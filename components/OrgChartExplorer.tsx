"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import OrgChartTree from "@/components/OrgChartTree"
import type { OrgNode } from "@/app/org-chart/page"

function collectIds(nodes: OrgNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children)])
}

function collectDepthIds(nodes: OrgNode[], maxDepth: number, depth = 0): string[] {
  return nodes.flatMap((node) => [
    ...(depth <= maxDepth ? [node.id] : []),
    ...collectDepthIds(node.children, maxDepth, depth + 1),
  ])
}

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

  const defaultExpanded = useMemo(() => new Set(collectDepthIds(filteredTree, 1)), [filteredTree])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded)

  useEffect(() => {
    setExpandedIds(defaultExpanded)
  }, [defaultExpanded])

  const highlightedIds = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return new Set<string>()

    const ids = new Set<string>()
    const walk = (nodes: OrgNode[]) => {
      nodes.forEach((node) => {
        if (
          node.name.toLowerCase().includes(query) ||
          node.position?.toLowerCase().includes(query) ||
          node.department?.toLowerCase().includes(query)
        ) {
          ids.add(node.id)
        }
        walk(node.children)
      })
    }
    walk(filteredTree)
    return ids
  }, [filteredTree, deferredSearch])

  const visiblePeople = countNodes(filteredTree)
  const visibleLeaders = countLeaders(filteredTree)
  const visibleDepth = maxDepth(filteredTree)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="People" value={String(totalPeople)} tone="blue" />
        <StatCard label="Visible now" value={String(visiblePeople)} tone="green" />
        <StatCard label="Team leads" value={String(visibleLeaders)} tone="amber" />
        <StatCard label="Levels" value={String(visibleDepth)} tone="rose" />
      </section>

      <section className="panel p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.8fr)_auto_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, role, or department"
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
          />
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set(collectIds(filteredTree)))}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set(collectDepthIds(filteredTree, 1)))}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
          >
            Reset view
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          The chart follows each employee&apos;s assigned line manager. Filter or search to focus on a specific part of the reporting structure.
        </p>
      </section>

      <section className="panel overflow-x-auto p-6">
        {filteredTree.length > 0 ? (
          <OrgChartTree
            tree={filteredTree}
            expandedIds={expandedIds}
            highlightedIds={highlightedIds}
            onToggle={(id) =>
              setExpandedIds((current) => {
                const next = new Set(current)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
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
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const

  return (
    <div className={`rounded-2xl border px-4 py-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
