import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { canAccessAdminSection, normalizeRole } from "@/lib/rbac"
import { EmptyState, MetricBar, SectionCard, StatCard } from "@/components/ModuleCards"
import { completeAttendanceRecord, createAttendanceRecord } from "@/app/admin/attendance/actions"
import ModuleSetupNotice from "@/components/ModuleSetupNotice"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { average } from "@/lib/performance"
import { formatMinutes } from "@/lib/attendance"

export default async function AdminAttendancePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canAccessAdminSection(session.user.role, "attendance")) redirect("/admin")
  if (!hasPrismaDelegates("attendanceRecord")) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <ModuleSetupNotice title="Attendance runtime reload required" />
      </div>
    )
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, department: true },
  })
  if (!actor) redirect("/login")

  const role = normalizeRole(actor.role)
  const employeeWhere = role === "manager"
    ? {
        OR: [
          { managerId: actor.id },
          ...(actor.department ? [{ department: actor.department }] : []),
        ],
        status: "active" as const,
        role: { notIn: ["admin", "super_admin"] },
      }
    : {
        status: "active" as const,
        role: { notIn: ["admin", "super_admin"] },
      }

  const attendanceWhere = role === "manager" && actor.department
    ? { departmentSnapshot: actor.department }
    : undefined

  const [records, employees] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: attendanceWhere,
      orderBy: { checkInAt: "desc" },
      take: 25,
      include: {
        user: { select: { name: true, preferredName: true, email: true, department: true } },
      },
    }),
    prisma.user.findMany({
      where: employeeWhere,
      select: { id: true, name: true, preferredName: true, email: true, department: true },
      orderBy: { name: "asc" },
    }),
  ])

  const openRecords = records.filter((record) => !record.checkOutAt)
  const totalOvertimeMinutes = records.reduce((sum, record) => sum + record.overtimeMinutes, 0)
  const averageWorkedMinutes = average(records.map((record) => record.workedMinutes))

  const departmentCounts = records.reduce<Record<string, number>>((acc, record) => {
    const key = record.departmentSnapshot || record.user.department || "Unassigned"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="px-4 py-6 sm:px-0">
      <section className="panel-soft mb-6 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Workforce Control</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Attendance</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Monitor attendance records, check-in and check-out history, and overtime across teams.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Recent records" value={records.length} tone="blue" />
        <StatCard label="Open check-outs" value={openRecords.length} tone="amber" />
        <StatCard label="Avg worked time" value={formatMinutes(Math.round(averageWorkedMinutes))} tone="green" />
        <StatCard label="Overtime tracked" value={formatMinutes(totalOvertimeMinutes)} tone="rose" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Log Attendance" description="Create an attendance entry for an employee.">
          <form action={createAttendanceRecord} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="userId" required className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.preferredName || employee.name || employee.email}{employee.department ? ` · ${employee.department}` : ""}
                </option>
              ))}
            </select>
            <input name="checkInAt" type="datetime-local" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="checkOutAt" type="datetime-local" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="status" defaultValue="present" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="present">Present</option>
              <option value="incomplete">Incomplete</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
            <textarea name="notes" rows={3} placeholder="Notes" className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
            <button className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown md:col-span-2">Save attendance</button>
          </form>
        </SectionCard>

        <SectionCard title="Department Attendance Mix" description="Recent attendance distribution by department.">
          <div className="space-y-4">
            {Object.entries(departmentCounts).length > 0 ? (
              Object.entries(departmentCounts).map(([department, count]) => (
                <MetricBar key={department} label={department} value={count} total={Math.max(records.length, 1)} tone="green" />
              ))
            ) : (
              <EmptyState label="No attendance data available." />
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Attendance Oversight" description="Latest employee check-in and check-out records.">
        <div className="space-y-3">
          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">
                  {record.user.preferredName || record.user.name || record.user.email}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {record.departmentSnapshot || record.user.department || "No department"} • {record.status}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Check-in {record.checkInAt.toLocaleString()}
                  {" • "}
                  Check-out {record.checkOutAt ? record.checkOutAt.toLocaleString() : "Pending"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Worked {formatMinutes(record.workedMinutes)} • Overtime {formatMinutes(record.overtimeMinutes)}
                </p>
                {!record.checkOutAt ? (
                  <form action={completeAttendanceRecord} className="mt-3 flex gap-2">
                    <input type="hidden" name="recordId" value={record.id} />
                    <input name="checkOutAt" type="datetime-local" required className="rounded-md border border-gray-300 px-3 py-1.5 text-xs" />
                    <button className="rounded-md border border-[#e3bc68] bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-brown">
                      Complete check-out
                    </button>
                  </form>
                ) : null}
                {record.notes ? <p className="mt-2 text-sm text-gray-600">{record.notes}</p> : null}
              </div>
            ))
          ) : (
            <EmptyState label="No attendance records recorded yet." />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
