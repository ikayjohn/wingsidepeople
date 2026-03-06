"use client"

import { useState, useEffect, useCallback } from "react"

interface Event {
  id: string
  title: string
  description: string | null
  category: string
  startDate: string
  endDate: string | null
  allDay: boolean
}

const CATEGORIES = [
  { value: "holiday", label: "Holiday", color: "bg-red-100 text-red-800" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-800" },
  { value: "birthday", label: "Birthday", color: "bg-purple-100 text-purple-800" },
  { value: "company_event", label: "Company Event", color: "bg-brand-gold-light text-brand-brown" },
]

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("company_event")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [allDay, setAllDay] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/events")
      if (res.ok) setEvents(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("company_event")
    setStartDate("")
    setEndDate("")
    setAllDay(true)
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (event: Event) => {
    setTitle(event.title)
    setDescription(event.description || "")
    setCategory(event.category)
    setStartDate(event.startDate.split("T")[0])
    setEndDate(event.endDate ? event.endDate.split("T")[0] : "")
    setAllDay(event.allDay)
    setEditingId(event.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingId ? `/api/admin/events/${editingId}` : "/api/admin/events"
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          startDate,
          endDate: endDate || null,
          allDay,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
        return
      }

      resetForm()
      fetchEvents()
    } catch {
      setError("Failed to save event")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return
    try {
      await fetch(`/api/admin/events/${id}`, { method: "DELETE" })
      fetchEvents()
    } catch {
      setError("Failed to delete event")
    }
  }

  const getCategoryStyle = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.color || "bg-gray-100 text-gray-800"
  }

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
          <p className="mt-2 text-gray-600">{events.length} event(s)</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
          >
            New Event
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? "Edit Event" : "New Event"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />
                  <span className="ml-2 text-sm text-gray-700">All day event</span>
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        {events.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryStyle(event.category)} mr-2`}>
                        {getCategoryLabel(event.category)}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(event.startDate).toLocaleDateString()}
                      {event.endDate && ` — ${new Date(event.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(event)} className="text-sm text-brand-brown hover:text-brand-brown-light">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(event.id)} className="text-sm text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No events</h3>
            <p className="mt-1 text-sm text-gray-500">Create events to populate the calendar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
