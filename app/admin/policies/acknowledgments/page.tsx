"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface PolicyStat {
  id: string
  title: string
  category: string
  acknowledgedCount: number
  totalEmployees: number
  percentage: number
}

const CATEGORY_LABELS: Record<string, string> = {
  hr: "Human Resources",
  it: "IT & Security",
  operations: "Operations",
  finance: "Finance",
  legal: "Legal",
  workplace: "Workplace",
  other: "Other",
}

export default function AcknowledgmentStatsPage() {
  const [stats, setStats] = useState<PolicyStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/policies/acknowledgment-stats")
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setStats(data.stats)
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStats()
    return () => { isMounted = false }
  }, [])

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
        <Link href="/admin/policies" className="text-sm text-brand-brown hover:text-brand-brown-light">
          &larr; Back to policies
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Policy Acknowledgments</h1>
        <p className="mt-2 text-gray-600">Track which employees have acknowledged each policy</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {stats.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {stats.map((policy) => (
              <li key={policy.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-gold-light text-brand-brown mr-2">
                        {CATEGORY_LABELS[policy.category] || policy.category}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{policy.title}</p>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className="bg-brand-gold rounded-full h-2"
                            style={{ width: `${policy.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {policy.acknowledgedCount}/{policy.totalEmployees} ({policy.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/admin/policies/acknowledgments/${policy.id}`}
                    className="ml-4 text-sm text-brand-brown hover:text-brand-brown-light font-medium"
                  >
                    View details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No policies</h3>
            <p className="mt-1 text-sm text-gray-500">Create policies to start tracking acknowledgments.</p>
          </div>
        )}
      </div>
    </div>
  )
}
