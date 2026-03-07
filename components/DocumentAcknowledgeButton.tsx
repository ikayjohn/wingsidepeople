"use client"

import { useEffect, useState } from "react"

export default function DocumentAcknowledgeButton({ documentId }: { documentId: string }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/receipt`)
        if (!res.ok) return

        const data = await res.json()
        if (isMounted) {
          setAcknowledged(data.acknowledged)
          setAcknowledgedAt(data.acknowledgedAt)
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    checkStatus()
    return () => { isMounted = false }
  }, [documentId])

  const handleAcknowledge = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/receipt`, { method: "POST" })
      if (!res.ok) return

      const data = await res.json()
      setAcknowledged(true)
      setAcknowledgedAt(data.acknowledgedAt)
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <span className="text-xs text-gray-400">Checking acknowledgment...</span>
  }

  if (acknowledged) {
    return (
      <div className="text-xs text-green-700">
        <span className="font-medium">Acknowledged</span>
        {acknowledgedAt && (
          <span className="text-green-600"> on {new Date(acknowledgedAt).toLocaleDateString()}</span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAcknowledge}
      disabled={submitting}
      className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
    >
      {submitting ? "Saving..." : "Acknowledge"}
    </button>
  )
}
