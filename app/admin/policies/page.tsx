"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import RichTextEditor from "@/components/RichTextEditor"

interface Policy {
  id: string
  title: string
  slug: string
  category: string
  status: "draft" | "in_review" | "published"
  summary: string | null
  content: string
  effectiveDate: string | null
  lastReviewed: string | null
  createdAt: string
}

const CATEGORIES = [
  { value: "hr", label: "Human Resources" },
  { value: "it", label: "IT & Security" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "workplace", label: "Workplace" },
  { value: "other", label: "Other" },
]

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [category, setCategory] = useState("hr")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<"draft" | "in_review" | "published">("published")
  const [content, setContent] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [lastReviewed, setLastReviewed] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/policies")
      if (res.ok) {
        const data = await res.json()
        setPolicies(data)
      }
    } catch {
      setError("Failed to fetch policies")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  const resetForm = () => {
    setTitle("")
    setSlug("")
    setCategory("hr")
    setSummary("")
    setStatus("published")
    setContent("")
    setEffectiveDate("")
    setLastReviewed("")
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (policy: Policy) => {
    setTitle(policy.title)
    setSlug(policy.slug)
    setCategory(policy.category)
    setSummary(policy.summary || "")
    setStatus(policy.status)
    setContent(policy.content)
    setEffectiveDate(policy.effectiveDate ? policy.effectiveDate.split("T")[0] : "")
    setLastReviewed(policy.lastReviewed ? policy.lastReviewed.split("T")[0] : "")
    setEditingId(policy.id)
    setShowForm(true)
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!editingId) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingId
        ? `/api/admin/policies/${editingId}`
        : "/api/admin/policies"

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          category,
          summary: summary || null,
          status,
          content,
          effectiveDate: effectiveDate || null,
          lastReviewed: lastReviewed || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
        return
      }

      resetForm()
      fetchPolicies()
    } catch {
      setError("Failed to save policy")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return

    try {
      const res = await fetch(`/api/admin/policies/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchPolicies()
      }
    } catch {
      setError("Failed to delete policy")
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Policies</h1>
          <p className="mt-2 text-gray-600">{policies.length} policy(ies)</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/policies/acknowledgments"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Acknowledgments
          </Link>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
            >
              New Policy
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? "Edit Policy" : "New Policy"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  maxLength={200}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9-]+$"
                  title="Lowercase letters, numbers, and hyphens only"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "in_review" | "published")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700">Effective Date</label>
                <input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="lastReviewed" className="block text-sm font-medium text-gray-700">Last Reviewed</label>
                <input
                  id="lastReviewed"
                  type="date"
                  value={lastReviewed}
                  onChange={(e) => setLastReviewed(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Summary</label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <RichTextEditor content={content} onChange={setContent} />
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
        {policies.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {policies.map((policy) => (
              <li key={policy.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-gold-light text-brand-brown mr-2">
                        {CATEGORIES.find((c) => c.value === policy.category)?.label || policy.category}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 mr-2">
                        {policy.status}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{policy.title}</p>
                    </div>
                    {policy.summary && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">{policy.summary}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(policy)}
                      className="text-sm text-brand-brown hover:text-brand-brown-light"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No policies</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new policy.</p>
          </div>
        )}
      </div>
    </div>
  )
}
