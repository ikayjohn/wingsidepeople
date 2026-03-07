"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

interface DirectoryUser {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  image: string | null
  role: string
  department: string | null
  position: string | null
  workLocation: string | null
  status: string
}

interface DirectoryDetail {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  image: string | null
  role: string
  phone: string | null
  address: string | null
  birthday: string | null
  department: string | null
  position: string | null
  manager: { id: string; name: string | null; preferredName: string | null; email: string } | null
  employmentType: string | null
  workLocation: string | null
  status: string
  emergencyContact: string | null
  emergencyPhone: string | null
}

interface DirectoryResponse {
  currentUserId: string
  employees: DirectoryUser[]
  filters: {
    departments: string[]
    roles: string[]
    locations: string[]
  }
}

export default function DirectoryPage() {
  const [currentUserId, setCurrentUserId] = useState("")
  const [employees, setEmployees] = useState<DirectoryUser[]>([])
  const [filters, setFilters] = useState<DirectoryResponse["filters"]>({
    departments: [],
    roles: [],
    locations: [],
  })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [department, setDepartment] = useState("")
  const [role, setRole] = useState("")
  const [location, setLocation] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<DirectoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (department) params.set("department", department)
    if (role) params.set("role", role)
    if (location) params.set("location", location)
    return params.toString()
  }, [q, department, role, location])

  const fetchDirectory = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/directory${queryString ? `?${queryString}` : ""}`)
      if (!res.ok) throw new Error("Failed to load directory")
      const data = (await res.json()) as DirectoryResponse
      setCurrentUserId(data.currentUserId)
      setEmployees(data.employees)
      setFilters(data.filters)
    } catch {
      setError("Failed to load directory")
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    fetchDirectory()
  }, [fetchDirectory])

  const fetchDetail = async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/directory/${id}`)
      if (!res.ok) throw new Error("Failed to load profile")
      const data = (await res.json()) as DirectoryDetail
      setSelected(data)
    } catch {
      setSelected(null)
      setError("Failed to load employee profile")
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Employee Directory</h1>
        <p className="mt-2 text-gray-600">Search and discover team members across the company</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="panel mb-6 grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, role, or email"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
        >
          <option value="">All Departments</option>
          {filters.departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
        >
          <option value="">All Roles</option>
          {filters.roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
        >
          <option value="">All Locations</option>
          {filters.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">People</h2>
            <p className="text-xs text-gray-500">{employees.length} result(s)</p>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading directory...</div>
          ) : employees.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <li key={employee.id} className="interactive-row px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => fetchDetail(employee.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {employee.preferredName || employee.name || employee.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.position || "No title"} • {employee.department || "No department"} • {employee.workLocation || "No location"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            selectedId === employee.id ? "bg-brand-gold-light text-brand-brown" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {employee.role}
                        </span>
                      </div>
                    </button>
                    {employee.id !== currentUserId && (
                      <Link
                        href={`/messages?userId=${employee.id}`}
                        className="rounded-full border border-[#e3bc68] bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-brown"
                      >
                        Message
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">No employees match these filters.</div>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Employee Profile</h2>
          {detailLoading ? (
            <p className="text-sm text-gray-500">Loading profile...</p>
          ) : selected ? (
            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">Name:</span> {selected.preferredName || selected.name || "N/A"}</p>
              <p><span className="font-medium">Email:</span> {selected.email}</p>
              <p><span className="font-medium">Role:</span> {selected.role}</p>
              <p><span className="font-medium">Department:</span> {selected.department || "N/A"}</p>
              <p><span className="font-medium">Position:</span> {selected.position || "N/A"}</p>
              <p><span className="font-medium">Employment Type:</span> {selected.employmentType || "N/A"}</p>
              <p><span className="font-medium">Location:</span> {selected.workLocation || "N/A"}</p>
              <p><span className="font-medium">Status:</span> {selected.status}</p>
              {selected.manager && (
                <p>
                  <span className="font-medium">Manager:</span>{" "}
                  {selected.manager.preferredName || selected.manager.name || selected.manager.email}
                </p>
              )}
              {selected.phone && <p><span className="font-medium">Phone:</span> {selected.phone}</p>}
              {selected.birthday && <p><span className="font-medium">Birthday:</span> {new Date(selected.birthday).toLocaleDateString()}</p>}
              {selected.address && <p><span className="font-medium">Address:</span> {selected.address}</p>}
              {selected.emergencyContact && <p><span className="font-medium">Emergency Contact:</span> {selected.emergencyContact}</p>}
              {selected.emergencyPhone && <p><span className="font-medium">Emergency Phone:</span> {selected.emergencyPhone}</p>}
              {selected.id !== currentUserId && (
                <div className="pt-3">
                  <Link
                    href={`/messages?userId=${selected.id}`}
                    className="inline-flex rounded-full border border-[#e3bc68] bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-brown"
                  >
                    Message employee
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select an employee to view profile details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
