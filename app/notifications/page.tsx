"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let isMounted = true

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?page=${page}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setNotifications(data.notifications)
            setTotalPages(data.totalPages)
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchNotifications()

    return () => {
      isMounted = false
    }
  }, [page])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PUT" })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PUT" })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">Stay up to date with what&apos;s happening</p>
        </div>
        <button
          onClick={markAllRead}
          className="text-sm text-brand-brown hover:text-brand-brown-light font-medium"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
        ) : notifications.length > 0 ? (
          <>
            <ul className="divide-y divide-gray-200">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-4 sm:px-6 hover:bg-gray-50 ${!n.read ? "bg-brand-gold-light" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => { if (!n.read) markRead(n.id) }}
                          className="block"
                        >
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                        </Link>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      <span className="text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-xs text-brand-brown hover:text-brand-brown-light"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="px-4 py-3 flex justify-between items-center border-t border-gray-200">
                <button
                  onClick={() => {
                    setLoading(true)
                    setPage((p) => Math.max(1, p - 1))
                  }}
                  disabled={page === 1}
                  className="text-sm text-brand-brown disabled:text-gray-300"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => {
                    setLoading(true)
                    setPage((p) => Math.min(totalPages, p + 1))
                  }}
                  disabled={page === totalPages}
                  className="text-sm text-brand-brown disabled:text-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  )
}
