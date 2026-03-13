import type { ReactNode } from "react"

export function StatCard({
  label,
  value,
  tone = "slate",
  detail,
}: {
  label: string
  value: string | number
  tone?: "slate" | "green" | "amber" | "rose" | "blue"
  detail?: string
}) {
  const tones = {
    slate: "border-gray-200 bg-white text-gray-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
  } as const

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs opacity-70">{detail}</p> : null}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-gray-500">{label}</p>
}

export function MetricBar({
  label,
  value,
  total,
  tone = "gold",
}: {
  label: string
  value: number
  total: number
  tone?: "gold" | "blue" | "green" | "rose"
}) {
  const width = total > 0 ? Math.max(6, Math.round((value / total) * 100)) : 0
  const colors = {
    gold: "from-[#ffd978] to-[#ffb62e]",
    blue: "from-sky-300 to-blue-500",
    green: "from-emerald-300 to-emerald-500",
    rose: "from-rose-300 to-rose-500",
  } as const

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-xs font-medium text-gray-500">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${colors[tone]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
