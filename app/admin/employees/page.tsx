"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  getDepartmentsFromRoles,
  getRecommendedManagerIdsForRole,
  getRoleOptionsByDepartment,
  type OrgRoleRecord,
} from "@/lib/org-structure"

type Employee = {
  id: string
  name: string | null
  preferredName: string | null
  employeeId: string | null
  email: string
  role: string
  gender: string | null
  phone: string | null
  address: string | null
  department: string | null
  position: string | null
  managerId: string | null
  employmentType: string | null
  workLocation: string | null
  status: string
  createdAt: string
}

type ManagerOption = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  department: string | null
  position: string | null
}

type EmployeesPayload = {
  employees: Employee[]
  managers: ManagerOption[]
  orgRoles: OrgRoleRecord[]
  workLocations: string[]
  employeeIdPrefix: string
  employeeIdDigits: number
  defaultEmploymentType: string
}

type EditableEmployee = {
  firstName: string
  lastName: string
  preferredName: string
  employeeId: string
  gender: string
  phone: string
  address: string
  department: string
  position: string
  managerId: string
  employmentType: string
  workLocation: string
  status: string
}

function normalizeDraft(draft: Partial<EditableEmployee> | null, defaultEmploymentType: string): EditableEmployee | null {
  if (!draft) return null

  return {
    firstName: draft.firstName ?? "",
    lastName: draft.lastName ?? "",
    preferredName: draft.preferredName ?? "",
    employeeId: draft.employeeId ?? "",
    gender: draft.gender ?? "",
    phone: draft.phone ?? "",
    address: draft.address ?? "",
    department: draft.department ?? "",
    position: draft.position ?? "",
    managerId: draft.managerId ?? "",
    employmentType: draft.employmentType ?? defaultEmploymentType,
    workLocation: draft.workLocation ?? "",
    status: draft.status ?? "active",
  }
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
] as const

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [orgRoles, setOrgRoles] = useState<OrgRoleRecord[]>([])
  const [workLocations, setWorkLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditableEmployee | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [employeeIdPrefix, setEmployeeIdPrefix] = useState("WS")
  const [employeeIdDigits, setEmployeeIdDigits] = useState(4)
  const [defaultEmploymentType, setDefaultEmploymentType] = useState("full_time")

  const pendingEmployees = useMemo(
    () => employees.filter((e) => e.status === "pending_approval"),
    [employees]
  )
  const allEmployees = useMemo(
    () => [...employees].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [employees]
  )
  const urgentPendingCount = useMemo(
    () => pendingEmployees.filter((e) => getPendingAgeDays(e.createdAt) >= 3).length,
    [pendingEmployees]
  )
  const employeeIdRegex = useMemo(
    () => new RegExp(`^${employeeIdPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d{${employeeIdDigits}}$`),
    [employeeIdDigits, employeeIdPrefix]
  )
  const employeeIdExample = useMemo(
    () => `${employeeIdPrefix}${"0".repeat(Math.max(1, employeeIdDigits))}`,
    [employeeIdDigits, employeeIdPrefix]
  )
  const safeDraft = useMemo(
    () => normalizeDraft(draft, defaultEmploymentType),
    [draft, defaultEmploymentType]
  )
  const availableRoles = useMemo(
    () => (safeDraft?.department ? getRoleOptionsByDepartment(orgRoles, safeDraft.department) : []),
    [orgRoles, safeDraft?.department]
  )
  const availableDepartments = useMemo(() => getDepartmentsFromRoles(orgRoles), [orgRoles])
  const recommendedManagerIds = useMemo(
    () =>
      safeDraft?.department && safeDraft.position
        ? getRecommendedManagerIdsForRole(orgRoles, employees, safeDraft.department, safeDraft.position)
        : [],
    [employees, orgRoles, safeDraft?.department, safeDraft?.position]
  )
  const recommendedManagers = useMemo(
    () => managers.filter((manager) => recommendedManagerIds.includes(manager.id)),
    [managers, recommendedManagerIds]
  )
  const sortedManagers = useMemo(() => {
    const recommendedSet = new Set(recommendedManagerIds)
    return [...managers].sort((a, b) => {
      const aPriority = recommendedSet.has(a.id) ? 0 : 1
      const bPriority = recommendedSet.has(b.id) ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return (a.preferredName || a.name || a.email).localeCompare(b.preferredName || b.name || b.email)
    })
  }, [managers, recommendedManagerIds])

  async function loadEmployees() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" })
      if (!response.ok) {
        setError("Failed to load employees")
        return
      }
      const data = (await response.json()) as EmployeesPayload
      setEmployees(data.employees)
      setManagers(data.managers)
      setOrgRoles(data.orgRoles)
      setWorkLocations(data.workLocations)
      setEmployeeIdPrefix(data.employeeIdPrefix)
      setEmployeeIdDigits(data.employeeIdDigits)
      setDefaultEmploymentType(data.defaultEmploymentType)
    } catch {
      setError("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  function beginEdit(employee: Employee) {
    const nameParts = splitName(employee.name)
    setEditingId(employee.id)
    setDraft({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      preferredName: employee.preferredName || "",
      employeeId: employee.employeeId || "",
      gender: employee.gender || "",
      phone: employee.phone || "",
      address: employee.address || "",
      department: employee.department || "",
      position: employee.position || "",
      managerId: employee.managerId || "",
      employmentType: employee.employmentType || defaultEmploymentType,
      workLocation: employee.workLocation || "",
      status: employee.status,
    })
    setError("")
    setMessage("")
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

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

  async function saveEdit(userId: string) {
    if (!safeDraft) return

    setUpdatingId(userId)
    setError("")
    setMessage("")

    if (safeDraft.employeeId && !employeeIdRegex.test(safeDraft.employeeId.trim().toUpperCase())) {
      setUpdatingId(null)
      setError(`Employee ID must use the format ${employeeIdExample}`)
      return
    }

    try {
      const response = await fetch("/api/admin/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: `${safeDraft.firstName} ${safeDraft.lastName}`.trim(),
          preferredName: safeDraft.preferredName || null,
          employeeId: safeDraft.employeeId ? safeDraft.employeeId.trim().toUpperCase() : null,
          gender: safeDraft.gender || null,
          phone: safeDraft.phone || null,
          address: safeDraft.address || null,
          department: safeDraft.department || null,
          position: safeDraft.position || null,
          managerId: safeDraft.managerId || null,
          employmentType: safeDraft.employmentType || defaultEmploymentType,
          workLocation: safeDraft.workLocation || null,
          status: safeDraft.status,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setError(data.error || "Failed to update employee")
        return
      }

      setMessage("Employee updated successfully.")
      cancelEdit()
      await loadEmployees()
    } catch {
      setError("Failed to update employee")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-brown">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Employees</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Review signups, edit staff records, and reassign department, role, manager, location, and status from one place.
        </p>
      </div>

      {message ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="panel overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Approvals ({pendingEmployees.length})</h2>
          <p className="mt-1 text-xs text-gray-500">Urgent (3+ days waiting): {urgentPendingCount}</p>
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
                    <p className="text-sm font-semibold text-gray-900">{employee.preferredName || employee.name || employee.email}</p>
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
                      onClick={() => beginEdit(employee)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Edit
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

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">All Users ({allEmployees.length})</h2>
          <p className="mt-1 text-xs text-gray-500">Full staff list with editable employee records.</p>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading employees...</p>
        ) : allEmployees.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No users found.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {allEmployees.map((employee) => {
              const isEditing = editingId === employee.id && safeDraft
              return (
                <li key={employee.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{employee.preferredName || employee.name || employee.email}</p>
                        <StatusBadge status={employee.status} />
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">Access: {employee.role}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{employee.email}</p>
                      <p className="mt-1 text-xs text-[#4b5563]">
                        {employee.department || "No department"} • {employee.position || "No position"} • {employee.workLocation || "No location"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Joined {formatSubmittedDate(employee.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={updatingId === employee.id}
                        onClick={() => beginEdit(employee)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Edit staff info
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div key={`edit-${employee.id}`} className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="First Name">
                          <input value={safeDraft.firstName} onChange={(e) => setDraft({ ...safeDraft, firstName: e.target.value })} className={inputClassName} />
                        </Field>
                        <Field label="Last Name">
                          <input value={safeDraft.lastName} onChange={(e) => setDraft({ ...safeDraft, lastName: e.target.value })} className={inputClassName} />
                        </Field>
                        <Field label="Preferred Name">
                          <input value={safeDraft.preferredName} onChange={(e) => setDraft({ ...safeDraft, preferredName: e.target.value })} className={inputClassName} />
                        </Field>
                        <Field label="Employee ID">
                          <input value={safeDraft.employeeId} onChange={(e) => setDraft({ ...safeDraft, employeeId: e.target.value.toUpperCase() })} placeholder={employeeIdExample} className={inputClassName} />
                        </Field>
                        <Field label="Status">
                          <select value={safeDraft.status} onChange={(e) => setDraft({ ...safeDraft, status: e.target.value })} className={inputClassName}>
                            <option value="active">active</option>
                            <option value="pending_approval">pending approval</option>
                            <option value="rejected">rejected</option>
                            <option value="suspended">suspended</option>
                            <option value="exited">exited</option>
                          </select>
                        </Field>
                        <Field label="Gender">
                          <select value={safeDraft.gender} onChange={(e) => setDraft({ ...safeDraft, gender: e.target.value })} className={inputClassName}>
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </Field>
                        <Field label="Phone">
                          <input value={safeDraft.phone} onChange={(e) => setDraft({ ...safeDraft, phone: e.target.value })} className={inputClassName} />
                        </Field>
                        <Field label="Department">
                          <select
                            value={safeDraft.department}
                            onChange={(e) => {
                              const nextDepartment = e.target.value
                              const matchingRoles = getRoleOptionsByDepartment(orgRoles, nextDepartment)
                              setDraft({
                                ...safeDraft,
                                department: nextDepartment,
                                position: matchingRoles.some((item) => item.title === safeDraft.position) ? safeDraft.position : "",
                              })
                            }}
                            className={inputClassName}
                          >
                            <option value="">Select department</option>
                            {availableDepartments.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Role">
                          <select value={safeDraft.position} onChange={(e) => setDraft({ ...safeDraft, position: e.target.value })} disabled={!safeDraft.department} className={inputClassName}>
                            <option value="">{safeDraft.department ? "Select role" : "Select department first"}</option>
                            {availableRoles.map((item) => (
                              <option key={item.title} value={item.title}>{item.title}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Line Manager">
                          <select value={safeDraft.managerId} onChange={(e) => setDraft({ ...safeDraft, managerId: e.target.value })} className={inputClassName}>
                            <option value="">No line manager</option>
                            {sortedManagers.filter((manager) => manager.id !== employee.id).map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {(manager.preferredName || manager.name || manager.email) +
                                  (manager.position ? ` • ${manager.position}` : "") +
                                  (manager.department ? ` • ${manager.department}` : "")}
                              </option>
                            ))}
                          </select>
                          {recommendedManagers.length > 0 ? (
                            <p className="mt-1 text-xs text-gray-500">
                              Recommended: {recommendedManagers.map((manager) => manager.preferredName || manager.name || manager.email).join(", ")}
                            </p>
                          ) : null}
                        </Field>
                        <Field label="Employment Type">
                          <select value={safeDraft.employmentType} onChange={(e) => setDraft({ ...safeDraft, employmentType: e.target.value })} className={inputClassName}>
                            {EMPLOYMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Work Location">
                          <select value={safeDraft.workLocation} onChange={(e) => setDraft({ ...safeDraft, workLocation: e.target.value })} className={inputClassName}>
                            <option value="">Select work location</option>
                            {workLocations.map((location) => (
                              <option key={location} value={location}>{location}</option>
                            ))}
                          </select>
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Address">
                            <textarea value={safeDraft.address} onChange={(e) => setDraft({ ...safeDraft, address: e.target.value })} rows={2} className={inputClassName} />
                          </Field>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === employee.id}
                          onClick={() => saveEdit(employee.id)}
                          className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-60"
                        >
                          {updatingId === employee.id ? "Saving..." : "Save changes"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputClassName =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-gold focus:outline-none focus:ring-brand-gold disabled:bg-gray-100"

function getPendingAgeDays(createdAt: string) {
  const created = new Date(createdAt)
  const now = Date.now()
  const diffMs = Math.max(0, now - created.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatSubmittedDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString()
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "pending_approval"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "rejected" || status === "suspended" || status === "exited"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-700"

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  )
}

function splitName(name: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}
