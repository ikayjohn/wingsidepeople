"use client"

import { useCallback, useEffect, useState } from "react"

interface LeaveItem {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: string
  reason: string | null
  reviewNotes: string | null
  user: { id: string; name: string | null; email: string; department: string | null; position: string | null }
}

interface HrItem {
  id: string
  type: string
  title: string
  description: string
  status: string
  priority: string
  response: string | null
  user: { id: string; name: string | null; email: string; department: string | null; position: string | null }
}

export default function AdminLeaveRequestsPage() {
  const [leaveItems, setLeaveItems] = useState<LeaveItem[]>([])
  const [hrItems, setHrItems] = useState<HrItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [leaveRes, reqRes] = await Promise.all([
        fetch("/api/admin/leave"),
        fetch("/api/admin/requests"),
      ])
      if (!leaveRes.ok || !reqRes.ok) throw new Error("Failed to load")
      setLeaveItems(await leaveRes.json())
      setHrItems(await reqRes.json())
    } catch {
      setError("Failed to load review queues")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const reviewLeave = async (id: string, status: "approved" | "rejected") => {
    const reviewNotes = prompt("Review notes (optional):") || ""
    const res = await fetch(`/api/admin/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes: reviewNotes || null }),
    })
    if (res.ok) fetchData()
  }

  const reviewRequest = async (id: string, status: "in_progress" | "resolved" | "rejected") => {
    const response = prompt("Response message (optional):") || ""
    const res = await fetch(`/api/admin/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, response: response || null }),
    })
    if (res.ok) fetchData()
  }

  if (loading) return <div className="px-4 py-6 text-sm text-gray-500">Loading queues...</div>

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leave & Request Reviews</h1>
        <p className="mt-2 text-gray-600">Review employee leave applications, HR requests, and reports.</p>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Leave Requests</h2>
        {leaveItems.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {leaveItems.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.user.name || item.user.email} • {item.leaveType} • {item.days} day{item.days > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()} • Status: {item.status}
                    </p>
                    {item.reason && <p className="text-xs text-gray-600 mt-1">Reason: {item.reason}</p>}
                  </div>
                  {item.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => reviewLeave(item.id, "approved")} className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Approve</button>
                      <button onClick={() => reviewLeave(item.id, "rejected")} className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Reject</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No leave requests to review.</p>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">HR Requests / Reports</h2>
        {hrItems.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {hrItems.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.user.name || item.user.email} • {item.type} • {item.priority} • Status: {item.status}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                    {item.response && <p className="text-xs text-gray-700 mt-1">Response: {item.response}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => reviewRequest(item.id, "in_progress")} className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200">In Progress</button>
                    <button onClick={() => reviewRequest(item.id, "resolved")} className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Resolve</button>
                    <button onClick={() => reviewRequest(item.id, "rejected")} className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Reject</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No HR requests to review.</p>
        )}
      </section>
    </div>
  )
}
