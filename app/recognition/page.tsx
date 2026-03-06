"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

interface DirectoryUser {
  id: string
  name: string | null
  preferredName: string | null
  department: string | null
}

interface BirthdayUser {
  id: string
  name: string | null
  preferredName: string | null
  department: string | null
  inDays: number
  anniversaryYears: number | null
}

interface RecognitionItem {
  id: string
  category: string
  title: string
  message: string
  createdAt: string
  fromUser: { id: string; name: string | null; preferredName: string | null }
  toUser: { id: string; name: string | null; preferredName: string | null; department: string | null }
}

export default function RecognitionPage() {
  const [employees, setEmployees] = useState<DirectoryUser[]>([])
  const [recognitions, setRecognitions] = useState<RecognitionItem[]>([])
  const [todaysBirthdays, setTodaysBirthdays] = useState<BirthdayUser[]>([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayUser[]>([])
  const [anniversaries, setAnniversaries] = useState<BirthdayUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [toUserId, setToUserId] = useState("")
  const [category, setCategory] = useState("teamwork")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [wishUserId, setWishUserId] = useState("")
  const [wishMessage, setWishMessage] = useState("")
  const [wishing, setWishing] = useState(false)

  const recipientOptions = useMemo(
    () =>
      employees.map((u) => ({
        id: u.id,
        label: `${u.preferredName || u.name || "Unnamed"}${u.department ? ` (${u.department})` : ""}`,
      })),
    [employees]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [directoryRes, birthdaysRes, recognitionRes] = await Promise.all([
        fetch("/api/directory"),
        fetch("/api/birthdays"),
        fetch("/api/recognition"),
      ])
      if (!directoryRes.ok || !birthdaysRes.ok || !recognitionRes.ok) throw new Error("Failed to load")
      const directory = await directoryRes.json()
      const birthdays = await birthdaysRes.json()
      const recognition = await recognitionRes.json()
      setEmployees(directory.employees || [])
      setTodaysBirthdays(birthdays.todaysBirthdays || [])
      setUpcomingBirthdays(birthdays.upcomingBirthdays || [])
      setAnniversaries(birthdays.anniversariesThisWeek || [])
      setRecognitions(recognition || [])
    } catch {
      setError("Failed to load recognition data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const submitRecognition = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage("")
    setError("")
    try {
      const res = await fetch("/api/recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId,
          category,
          title,
          message: note,
          isPublic: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to post recognition")
        return
      }
      setToUserId("")
      setCategory("teamwork")
      setTitle("")
      setNote("")
      setMessage("Recognition posted")
      fetchData()
    } catch {
      setError("Failed to post recognition")
    } finally {
      setSubmitting(false)
    }
  }

  const sendWish = async (e: React.FormEvent) => {
    e.preventDefault()
    setWishing(true)
    setMessage("")
    setError("")
    try {
      const res = await fetch(`/api/birthdays/${wishUserId}/wishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: wishMessage }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to send birthday wish")
        return
      }
      setWishUserId("")
      setWishMessage("")
      setMessage("Birthday wish sent")
    } catch {
      setError("Failed to send birthday wish")
    } finally {
      setWishing(false)
    }
  }

  if (loading) return <div className="px-4 py-6 text-sm text-gray-500">Loading recognition...</div>

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <div className="panel-soft p-6">
        <h1 className="text-3xl font-bold text-gray-900">Recognition</h1>
        <p className="mt-2 text-gray-600">Celebrate wins, birthdays, and milestones across the team.</p>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Today&apos;s Birthdays</h2>
          {todaysBirthdays.length > 0 ? (
            <ul className="space-y-2">
              {todaysBirthdays.map((u) => (
                <li key={u.id} className="text-sm text-gray-700">
                  <span className="font-medium">{u.preferredName || u.name}</span>
                  {u.department ? ` • ${u.department}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No birthdays today.</p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Upcoming Birthdays (7 days)</h2>
          {upcomingBirthdays.length > 0 ? (
            <ul className="space-y-2">
              {upcomingBirthdays.map((u) => (
                <li key={u.id} className="text-sm text-gray-700">
                  <span className="font-medium">{u.preferredName || u.name}</span> in {u.inDays} day{u.inDays > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No upcoming birthdays this week.</p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Work Anniversaries</h2>
          {anniversaries.length > 0 ? (
            <ul className="space-y-2">
              {anniversaries.map((u) => (
                <li key={u.id} className="text-sm text-gray-700">
                  <span className="font-medium">{u.preferredName || u.name}</span> • {u.anniversaryYears} year{u.anniversaryYears !== 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No anniversaries this week.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Send Birthday Wish</h2>
          <form onSubmit={sendWish} className="space-y-3">
            <select value={wishUserId} onChange={(e) => setWishUserId(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select birthday celebrant...</option>
              {[...todaysBirthdays, ...upcomingBirthdays].map((u) => (
                <option key={u.id} value={u.id}>{u.preferredName || u.name}</option>
              ))}
            </select>
            <textarea value={wishMessage} onChange={(e) => setWishMessage(e.target.value)} required rows={3} maxLength={280} placeholder="Write a quick birthday wish..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={wishing} className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-50">
              {wishing ? "Sending..." : "Send Wish"}
            </button>
          </form>
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Peer Recognition</h2>
          <form onSubmit={submitRecognition} className="space-y-3">
            <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select colleague...</option>
              {recipientOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="teamwork">Teamwork</option>
              <option value="leadership">Leadership</option>
              <option value="innovation">Innovation</option>
              <option value="customer_impact">Customer Impact</option>
              <option value="milestone">Milestone</option>
              <option value="other">Other</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Recognition title" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} required rows={3} maxLength={1000} placeholder="What did they do well?" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={submitting} className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown disabled:opacity-50">
              {submitting ? "Posting..." : "Post Recognition"}
            </button>
          </form>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recognition Feed</h2>
        {recognitions.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recognitions.map((r) => (
              <li key={r.id} className="interactive-row rounded-md px-2 py-3">
                <p className="text-sm font-medium text-gray-900">
                  {r.fromUser.preferredName || r.fromUser.name} recognized {r.toUser.preferredName || r.toUser.name}
                </p>
                <p className="text-xs text-gray-500">{r.category} • {new Date(r.createdAt).toLocaleString()}</p>
                <p className="text-sm text-gray-700 mt-1">{r.title}</p>
                <p className="text-sm text-gray-600">{r.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recognition posts yet.</p>
        )}
      </div>
    </div>
  )
}
