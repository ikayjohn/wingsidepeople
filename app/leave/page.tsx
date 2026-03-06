"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string | null
  status: string
  reviewNotes: string | null
  createdAt: string
}

interface HrRequest {
  id: string
  type: string
  title: string
  description: string
  status: string
  priority: string
  response: string | null
  createdAt: string
}

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [hrRequests, setHrRequests] = useState<HrRequest[]>([])
  const [balance, setBalance] = useState({ allowance: 20, used: 0, remaining: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [leaveType, setLeaveType] = useState("annual")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)

  const [requestType, setRequestType] = useState("hr")
  const [requestTitle, setRequestTitle] = useState("")
  const [requestDescription, setRequestDescription] = useState("")
  const [requestPriority, setRequestPriority] = useState("normal")
  const [requestSubmitting, setRequestSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [leaveRes, requestRes] = await Promise.all([
        fetch("/api/leave"),
        fetch("/api/requests"),
      ])
      if (!leaveRes.ok || !requestRes.ok) throw new Error("Failed to load data")
      const leaveData = await leaveRes.json()
      const requestData = await requestRes.json()
      setLeaveRequests(leaveData.requests || [])
      setBalance(leaveData.leaveBalance || { allowance: 20, used: 0, remaining: 20 })
      setHrRequests(requestData || [])
    } catch {
      setError("Failed to load leave and request data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeaveSubmitting(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: leaveReason || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit leave request")
        return
      }
      setLeaveType("annual")
      setStartDate("")
      setEndDate("")
      setLeaveReason("")
      setMessage("Leave request submitted")
      fetchData()
    } catch {
      setError("Failed to submit leave request")
    } finally {
      setLeaveSubmitting(false)
    }
  }

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestSubmitting(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: requestType,
          title: requestTitle,
          description: requestDescription,
          priority: requestPriority,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit request")
        return
      }
      setRequestType("hr")
      setRequestTitle("")
      setRequestDescription("")
      setRequestPriority("normal")
      setMessage("Request submitted")
      fetchData()
    } catch {
      setError("Failed to submit request")
    } finally {
      setRequestSubmitting(false)
    }
  }

  const cancelLeave = async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" })
    if (res.ok) fetchData()
  }

  if (loading) {
    return <div className="px-4 py-6 text-sm text-gray-500">Loading leave module...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <div className="panel-soft p-6">
        <h1 className="text-3xl font-bold text-gray-900">Leave & Requests</h1>
        <p className="mt-2 text-gray-600">Apply for leave, track approvals, and submit employee requests.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Annual Allowance" value={`${balance.allowance} days`} />
        <StatCard label="Used (Approved)" value={`${balance.used} days`} />
        <StatCard label="Remaining" value={`${balance.remaining} days`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Apply for Leave</h2>
          <form onSubmit={submitLeave} className="space-y-3">
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="compassionate">Compassionate</option>
              <option value="unpaid">Unpaid</option>
              <option value="other">Other</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} placeholder="Reason (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={leaveSubmitting} className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-50">
              {leaveSubmitting ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>
        </div>

        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Submit HR Request / Report</h2>
          <form onSubmit={submitRequest} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="hr">HR</option>
                <option value="report">Report</option>
                <option value="it">IT</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
              <select value={requestPriority} onChange={(e) => setRequestPriority(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <input type="text" required value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} placeholder="Title" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea required value={requestDescription} onChange={(e) => setRequestDescription(e.target.value)} rows={3} placeholder="Describe your request or report" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={requestSubmitting} className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-50">
              {requestSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard
          title="My Leave Requests"
          emptyLabel="No leave requests yet."
          rows={leaveRequests.map((item) => (
            <div key={item.id} className="interactive-row rounded-md px-2 py-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.leaveType} leave</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()} ({item.days} day{item.days > 1 ? "s" : ""})
                </p>
                <p className="text-xs text-gray-500">Status: {item.status}</p>
              </div>
              {item.status === "pending" && (
                <button onClick={() => cancelLeave(item.id)} className="text-xs text-red-600 hover:text-red-800">Cancel</button>
              )}
            </div>
          ))}
        />

        <ListCard
          title="My Requests & Reports"
          emptyLabel="No requests submitted yet."
          rows={hrRequests.map((item) => (
            <div key={item.id} className="interactive-row rounded-md px-2 py-2">
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500">{item.type} • {item.priority} • {item.status}</p>
              {item.response && <p className="mt-1 text-xs text-gray-600">Response: {item.response}</p>}
            </div>
          ))}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function ListCard({ title, rows, emptyLabel }: { title: string; rows: ReactNode[]; emptyLabel: string }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3">
        {rows.length > 0 ? rows : <p className="text-sm text-gray-500">{emptyLabel}</p>}
      </div>
    </div>
  )
}
