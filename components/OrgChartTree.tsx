"use client"

import Image from "next/image"
import type { OrgNode } from "@/lib/org-chart"

type HierarchyRow = {
  id: string
  depth: number
  name: string
  position: string | null
  occupantSummary: string | null
  image: string | null
  headcount: number
  directReports: number
  reportsCount: number
}

function flattenTree(nodes: OrgNode[], depth = 0): HierarchyRow[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      depth,
      name: node.name,
      position: node.position,
      occupantSummary: node.occupantSummary,
      image: node.image,
      headcount: node.headcount,
      directReports: node.children.length,
      reportsCount: node.reportsCount,
    },
    ...flattenTree(node.children, depth + 1),
  ])
}

function getRowClassName(depth: number) {
  if (depth === 1) {
    return "bg-[linear-gradient(90deg,rgba(255,244,214,0.9)_0%,rgba(255,251,238,0.9)_100%)]"
  }

  return "hover:bg-[#fbfcfe]"
}

function getNameClassName(depth: number) {
  if (depth === 1) {
    return "inline-block rounded-full bg-[#fff1c7] px-2.5 py-1 text-[#7a4b00] ring-1 ring-[#f0d48a]"
  }

  return ""
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={28}
        height={28}
        unoptimized={image.startsWith("/api/profile/photo")}
        className="h-7 w-7 rounded-full border border-white object-cover shadow-sm"
      />
    )
  }

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#F5B800] text-[10px] font-bold text-[#3D1A0E] shadow-sm">
      {initials}
    </div>
  )
}

export default function OrgChartTree({ tree }: { tree: OrgNode[] }) {
  const rows = flattenTree(tree)

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-[#dde6f2] bg-white shadow-[0_18px_48px_rgba(148,163,184,0.14)]">
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_84px_84px_84px] lg:gap-3 border-b border-[#e8eef6] bg-[#f7fafe] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7f92]">
        <div>Hierarchy</div>
        <div>Occupant</div>
        <div className="text-right">Assigned</div>
        <div className="text-right">Direct</div>
        <div className="text-right">Below</div>
      </div>

      <div className="divide-y divide-[#eef2f7]">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`grid grid-cols-1 gap-3 px-4 py-3 text-sm text-gray-700 transition-colors lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_84px_84px_84px] lg:items-center lg:gap-3 ${getRowClassName(row.depth)}`}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${row.depth * 18}px` }}>
                {row.depth > 0 ? (
                  <span className="text-xs text-[#a2aec0]">{row.depth === 1 ? "└" : "└┈"}</span>
                ) : null}
                <div className="min-w-0 space-y-1">
                  <div className="min-w-0">
                    <p className={`truncate font-semibold text-gray-900 ${getNameClassName(row.depth)}`}>{row.name}</p>
                  </div>
                  {row.position ? <p className="truncate text-xs text-gray-500">{row.position}</p> : null}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d8ba0] lg:hidden">
                Occupant
              </p>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={row.name} image={row.image} />
                <p className="truncate text-xs text-gray-600">
                  {row.occupantSummary || "Vacant role"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f7fafe] p-3 lg:contents">
              <MetricCell label="Assigned" value={row.headcount} />
              <MetricCell label="Direct" value={row.directReports} />
              <MetricCell label="Below" value={row.reportsCount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center lg:text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d8ba0] lg:hidden">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
