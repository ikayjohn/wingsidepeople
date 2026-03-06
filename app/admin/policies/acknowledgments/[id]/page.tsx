"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Acknowledgment {
  id: string
  acknowledgedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface PolicyInfo {
  id: string
  title: string
}

export default function PolicyAcknowledgmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [policy, setPolicy] = useState<PolicyInfo | null>(null)
  const [acknowledgments, setAcknowledgments] = useState<Acknowledgment[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/policies/${id}/acknowledgments`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setPolicy(data.policy)
            setAcknowledgments(data.acknowledgments)
            setTotalEmployees(data.totalEmployees)
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [id])

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

  const percentage = totalEmployees > 0
    ? Math.round((acknowledgments.length / totalEmployees) * 100)
    : 0

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <Link href="/admin/policies/acknowledgments" className="text-sm text-brand-brown hover:text-brand-brown-light">
          &larr; Back to acknowledgment stats
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{policy?.title}</h1>
        <p className="mt-2 text-gray-600">
          {acknowledgments.length} of {totalEmployees} employees acknowledged ({percentage}%)
        </p>
      </div>

      <div className="mb-6">
        <div className="bg-gray-200 rounded-full h-3">
          <div
            className="bg-brand-gold rounded-full h-3"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        {acknowledgments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {acknowledgments.map((ack) => (
              <li key={ack.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ack.user.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-gray-500">{ack.user.email}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(ack.acknowledgedAt).toLocaleDateString()} at{" "}
                    {new Date(ack.acknowledgedAt).toLocaleTimeString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No acknowledgments yet</h3>
            <p className="mt-1 text-sm text-gray-500">No employees have acknowledged this policy.</p>
          </div>
        )}
      </div>
    </div>
  )
}
