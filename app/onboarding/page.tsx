"use client"

import { useState, useEffect } from "react"

interface ProgressItem {
  id: string
  completed: boolean
  completedAt: string | null
  item: {
    id: string
    title: string
    description: string | null
    order: number
  }
}

interface Checklist {
  id: string
  assignedAt: string
  template: {
    id: string
    title: string
  }
  progress: ProgressItem[]
}

export default function OnboardingPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchChecklists = async () => {
      try {
        const res = await fetch("/api/onboarding/my-checklists")
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setChecklists(data)
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchChecklists()
    return () => { isMounted = false }
  }, [])

  const toggleItem = async (progressId: string) => {
    try {
      const res = await fetch(`/api/onboarding/progress/${progressId}`, { method: "PUT" })
      if (res.ok) {
        const updated = await res.json()
        setChecklists((prev) =>
          prev.map((c) => ({
            ...c,
            progress: c.progress.map((p) =>
              p.id === progressId
                ? { ...p, completed: updated.completed, completedAt: updated.completedAt }
                : p
            ),
          }))
        )
      }
    } catch {
      // ignore
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Onboarding</h1>
        <p className="mt-2 text-gray-600">Complete your assigned onboarding checklists</p>
      </div>

      {checklists.length > 0 ? (
        <div className="space-y-6">
          {checklists.map((checklist) => {
            const completed = checklist.progress.filter((p) => p.completed).length
            const total = checklist.progress.length
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

            return (
              <div key={checklist.id} className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">{checklist.template.title}</h2>
                    <span className="text-sm text-gray-500">
                      {completed}/{total} completed
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`rounded-full h-2 transition-all ${percentage === 100 ? "bg-green-500" : "bg-brand-gold"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Assigned {new Date(checklist.assignedAt).toLocaleDateString()}
                  </p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {checklist.progress.map((p) => (
                    <li key={p.id} className="px-4 py-3 sm:px-6">
                      <div className="flex items-start">
                        <button
                          onClick={() => toggleItem(p.id)}
                          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${
                            p.completed
                              ? "bg-brand-gold border-brand-gold"
                              : "border-gray-300 hover:border-brand-gold"
                          }`}
                        >
                          {p.completed && (
                            <svg className="w-3 h-3 text-brand-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${p.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                            {p.item.title}
                          </p>
                          {p.item.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{p.item.description}</p>
                          )}
                          {p.completedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Completed {new Date(p.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No onboarding checklists assigned to you yet.
          </div>
        </div>
      )}
    </div>
  )
}
