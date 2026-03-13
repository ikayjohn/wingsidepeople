import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { formatMinutes } from "@/lib/attendance"

export default async function AttendancePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasPrismaDelegates("attendanceRecord")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Attendance runtime reload required" />
      </div>
    )
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { checkInAt: "desc" },
    take: 20,
  })

  const completed = records.filter((record) => record.checkOutAt)
  const incomplete = records.filter((record) => !record.checkOutAt)
  const overtimeMinutes = records.reduce((sum, record) => sum + record.overtimeMinutes, 0)

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Attendance</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">My Attendance</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Review your check-in and check-out history, attendance records, and overtime totals.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Records" value={records.length} tone="blue" />
        <StatCard label="Completed days" value={completed.length} tone="green" />
        <StatCard label="Open records" value={incomplete.length} tone="amber" />
        <StatCard label="Overtime" value={formatMinutes(overtimeMinutes)} tone="rose" />
      </section>

      <SectionCard title="Attendance History" description="Your recent attendance records.">
        <div className="space-y-3">
          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {record.checkInAt.toLocaleDateString()}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {record.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Check-in: {record.checkInAt.toLocaleTimeString()}
                  {" • "}
                  Check-out: {record.checkOutAt ? record.checkOutAt.toLocaleTimeString() : "Pending"}
                </p>
                <div className="mt-3">
                  <MetricBar
                    label="Worked hours"
                    value={Math.min(record.workedMinutes ?? 0, 8 * 60)}
                    total={8 * 60}
                    tone="blue"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Worked: {formatMinutes(record.workedMinutes)}
                  {" • "}
                  Overtime: {formatMinutes(record.overtimeMinutes)}
                </p>
                {record.notes ? <p className="mt-2 text-sm text-gray-600">{record.notes}</p> : null}
              </div>
            ))
          ) : (
            <EmptyState label="No attendance records available yet." />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
