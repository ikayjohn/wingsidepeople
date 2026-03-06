"use client"

import { useState, useEffect } from "react"

export default function PolicyAcknowledgeButton({ policyId }: { policyId: string }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/receipt`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setAcknowledged(data.acknowledged)
            setAcknowledgedAt(data.acknowledgedAt)
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    checkStatus()
    return () => { isMounted = false }
  }, [policyId])

  const handleAcknowledge = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/policies/${policyId}/receipt`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAcknowledged(true)
        setAcknowledgedAt(data.acknowledgedAt)
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Checking acknowledgment status...</p>
      </div>
    )
  }

  if (acknowledged) {
    return (
      <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">You have acknowledged this policy</p>
            {acknowledgedAt && (
              <p className="text-xs text-green-600 mt-0.5">
                Acknowledged on {new Date(acknowledgedAt).toLocaleDateString()} at {new Date(acknowledgedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
      <p className="text-sm text-amber-800 mb-3">
        Please read and acknowledge this policy to confirm you understand its contents.
      </p>
      <button
        onClick={handleAcknowledge}
        disabled={submitting}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "I Acknowledge This Policy"}
      </button>
    </div>
  )
}
