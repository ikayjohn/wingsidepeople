"use client"

import Image from "next/image"
import type { OrgNode } from "@/app/org-chart/page"

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
      />
    )
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#F5B800] text-sm font-bold text-[#3D1A0E] shadow-sm">
      {initials}
    </div>
  )
}

function OrgNodeCard({
  node,
  expandedIds,
  highlightedIds,
  onToggle,
}: {
  node: OrgNode
  expandedIds: Set<string>
  highlightedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const expanded = expandedIds.has(node.id)
  const highlighted = highlightedIds.has(node.id)

  return (
    <li className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => {
          if (hasChildren) onToggle(node.id)
        }}
        className={`relative z-10 flex min-w-[190px] max-w-[230px] flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-center transition-shadow hover:shadow-md ${
          hasChildren ? "cursor-pointer" : "cursor-default"
        } ${
          highlighted
            ? "border-brand-gold bg-[#fff7df] shadow-[0_12px_30px_rgba(245,184,0,0.15)]"
            : "border-gray-200 bg-white"
        }`}
      >
        <Avatar name={node.name} image={node.image} />
        <div>
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {node.name}
          </p>
          {node.position && (
            <p className="mt-0.5 text-xs text-gray-600">{node.position}</p>
          )}
          {node.department && (
            <p className="mt-0.5 text-xs font-medium text-[#2f7ff5]">
              {node.department}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            {node.children.length} direct report{node.children.length === 1 ? "" : "s"}
          </span>
          {node.reportsCount > node.children.length ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              {node.reportsCount} total below
            </span>
          ) : null}
        </div>
        {hasChildren && (
          <span className="absolute -bottom-2.5 left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] text-gray-500 shadow-sm">
            {expanded ? "\u2212" : `+${node.children.length}`}
          </span>
        )}
      </button>

      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          <div className="h-6 w-px bg-gray-300" />

          {node.children.length === 1 ? (
            <ul className="flex">
              <OrgNodeCard
                node={node.children[0]}
                expandedIds={expandedIds}
                highlightedIds={highlightedIds}
                onToggle={onToggle}
              />
            </ul>
          ) : (
            <>
              <div className="relative flex justify-center">
                <ul className="relative flex gap-3">
                  {node.children.map((child, i) => (
                    <li
                      key={child.id}
                      className="relative flex flex-col items-center"
                    >
                      <div className="h-6 w-px bg-gray-300" />
                      <OrgNodeCard
                        node={child}
                        expandedIds={expandedIds}
                        highlightedIds={highlightedIds}
                        onToggle={onToggle}
                      />
                      {node.children.length > 1 && (
                        <>
                          {i > 0 && (
                            <div className="absolute top-0 right-1/2 left-[-4px] h-px bg-gray-300" />
                          )}
                          {i < node.children.length - 1 && (
                            <div className="absolute top-0 left-1/2 right-[-4px] h-px bg-gray-300" />
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export default function OrgChartTree({
  tree,
  expandedIds,
  highlightedIds,
  onToggle,
}: {
  tree: OrgNode[]
  expandedIds: Set<string>
  highlightedIds: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex min-w-max justify-center">
      <ul className="flex gap-8">
        {tree.map((root) => (
          <OrgNodeCard
            key={root.id}
            node={root}
            expandedIds={expandedIds}
            highlightedIds={highlightedIds}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  )
}
