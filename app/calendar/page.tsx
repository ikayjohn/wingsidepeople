"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

interface EventItem {
  id: string
  title: string
  description: string | null
  category: string
  startDate: string
  endDate: string | null
  allDay: boolean
  myRsvp: { status: "attending" | "maybe" | "not_attending"; updatedAt: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  holiday: "Holiday",
  meeting: "Meeting",
  birthday: "Birthday",
  company_event: "Company Event",
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [showPast, setShowPast] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/events")
      if (!res.ok) throw new Error("Failed to fetch events")
      setEvents(await res.json())
    } catch {
      setError("Failed to load calendar events")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const now = Date.now()
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.endDate || event.startDate).getTime()
      return showPast ? eventDate < now : eventDate >= now
    })
  }, [events, showPast, now])

  const setRsvp = async (eventId: string, status: "attending" | "maybe" | "not_attending") => {
    setSavingId(eventId)
    setError("")
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save RSVP")
        return
      }
      const updated = await res.json()
      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? { ...event, myRsvp: updated } : event))
      )
    } catch {
      setError("Failed to save RSVP")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-2 text-gray-600">Upcoming events, holidays, and meetings</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showPast ? "Show Upcoming" : "Show Past"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          {filteredEvents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-medium text-brand-brown">
                          {CATEGORY_LABELS[event.category] || event.category}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(event.startDate).toLocaleDateString()}
                        {event.endDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ""}
                        {!event.allDay && ` at ${new Date(event.startDate).toLocaleTimeString()}`}
                      </p>
                      {event.description && (
                        <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <RsvpButton
                        label="Attending"
                        active={event.myRsvp?.status === "attending"}
                        onClick={() => setRsvp(event.id, "attending")}
                        disabled={savingId === event.id}
                      />
                      <RsvpButton
                        label="Maybe"
                        active={event.myRsvp?.status === "maybe"}
                        onClick={() => setRsvp(event.id, "maybe")}
                        disabled={savingId === event.id}
                      />
                      <RsvpButton
                        label="Not Attending"
                        active={event.myRsvp?.status === "not_attending"}
                        onClick={() => setRsvp(event.id, "not_attending")}
                        disabled={savingId === event.id}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <h3 className="text-sm font-medium text-gray-900">No events</h3>
              <p className="mt-1 text-sm text-gray-500">
                {showPast ? "No past events found." : "No upcoming events found."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RsvpButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-md px-3 py-2 text-xs font-medium ${
        active
          ? "bg-brand-gold text-brand-brown"
          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  )
}
