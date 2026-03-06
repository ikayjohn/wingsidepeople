"use client"

import { useEffect, useMemo, useState } from "react"

type Employee = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  role: string
  department: string | null
  position: string | null
  workLocation: string | null
  status: string
  createdAt: string
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const pendingEmployees = useMemo(
    () => employees.filter((e) => e.status === "pending_approval"),
    [employees]
  )
  const urgentPendingCount = useMemo(
    () => pendingEmployees.filter((e) => getPendingAgeDays(e.createdAt) >= 3).length,
    [pendingEmployees]
  )

  async function loadEmployees() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" })
      if (!response.ok) {
        setError("Failed to load employees")
        return
      }
      const data = (await response.json()) as Employee[]
      setEmployees(data)
    } catch {
      setError("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  async function updateStatus(userId: string, status: Employee["status"]) {
    setUpdatingId(userId)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setError(data.error || "Failed to update employee status")
        return
      }

      setMessage(status === "active" ? "Employee approved successfully." : "Employee status updated.")
      await loadEmployees()
    } catch {
      setError("Failed to update employee status")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Employee Approvals</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Review new staff signups and approve access to the employee portal.
        </p>
      </div>

      {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="panel overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Approvals ({pendingEmployees.length})</h2>
          <p className="mt-1 text-xs text-gray-500">
            Urgent (3+ days waiting): {urgentPendingCount}
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading employees...</p>
        ) : pendingEmployees.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No pending approvals right now.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendingEmployees.map((employee) => (
              <li key={employee.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {employee.preferredName || employee.name || employee.email}
                    </p>
                    <p className="text-xs text-gray-500">{employee.email}</p>
                    <p className="mt-1 text-xs text-[#4b5563]">
                      {employee.department || "No department"} • {employee.position || "No position"} • {employee.workLocation || "No location"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Submitted {formatSubmittedDate(employee.createdAt)} ({getPendingAgeDays(employee.createdAt)} day{getPendingAgeDays(employee.createdAt) === 1 ? "" : "s"} ago)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updatingId === employee.id}
                      onClick={() => updateStatus(employee.id, "active")}
                      className="rounded-full border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === employee.id}
                      onClick={() => updateStatus(employee.id, "rejected")}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function getPendingAgeDays(createdAt: string) {
  const created = new Date(createdAt)
  const now = Date.now()
  const diffMs = Math.max(0, now - created.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatSubmittedDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString()
}
