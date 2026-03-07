"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface DocumentStat {
  id: string
  title: string
  category: string
  acknowledgedCount: number
  totalEmployees: number
  percentage: number
}

const CATEGORY_LABELS: Record<string, string> = {
  forms: "Forms",
  templates: "Templates",
  guides: "Guides",
  policies: "Policies",
  benefits: "Benefits",
  training: "Training",
  other: "Other",
}

export default function DocumentAcknowledgmentStatsPage() {
  const [stats, setStats] = useState<DocumentStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/documents/acknowledgment-stats")
        if (!res.ok) return

        const data = await res.json()
        if (isMounted) setStats(data.stats)
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
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <Link href="/admin/documents" className="text-sm text-brand-brown hover:text-brand-brown-light">
          &larr; Back to documents
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Document Acknowledgments</h1>
        <p className="mt-2 text-gray-600">Track which staff members have acknowledged each document.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {stats.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {stats.map((document: DocumentStat) => (
              <li key={document.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="mr-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-brand-gold-light text-brand-brown">
                        {CATEGORY_LABELS[document.category] || document.category}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{document.title}</p>
                    </div>
                    <div className="mt-2 flex items-center">
                      <div className="mr-3 h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-brand-gold"
                          style={{ width: `${document.percentage}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-sm text-gray-600">
                        {document.acknowledgedCount}/{document.totalEmployees} ({document.percentage}%)
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/documents/acknowledgments/${document.id}`}
                    className="ml-4 text-sm font-medium text-brand-brown hover:text-brand-brown-light"
                  >
                    View details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">Upload documents to start tracking acknowledgments.</p>
          </div>
        )}
      </div>
    </div>
  )
}
