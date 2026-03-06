"use client"

import { useState, useEffect, useCallback } from "react"
import RichTextEditor from "@/components/RichTextEditor"

interface HandbookSection {
  id: string
  title: string
  slug: string
  content: string
  order: number
  createdAt: string
}

export default function AdminHandbookPage() {
  const [sections, setSections] = useState<HandbookSection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [content, setContent] = useState("")
  const [order, setOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handbook")
      if (res.ok) {
        const data = await res.json()
        setSections(data)
      }
    } catch {
      setError("Failed to fetch sections")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  const resetForm = () => {
    setTitle("")
    setSlug("")
    setContent("")
    setOrder(sections.length)
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (section: HandbookSection) => {
    setTitle(section.title)
    setSlug(section.slug)
    setContent(section.content)
    setOrder(section.order)
    setEditingId(section.id)
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
        ? `/api/admin/handbook/${editingId}`
        : "/api/admin/handbook"

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content, order }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
        return
      }

      resetForm()
      fetchSections()
    } catch {
      setError("Failed to save section")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return

    try {
      const res = await fetch(`/api/admin/handbook/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchSections()
      }
    } catch {
      setError("Failed to delete section")
    }
  }

  const handleNewSection = () => {
    setOrder(sections.length)
    setShowForm(true)
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
          <h1 className="text-3xl font-bold text-gray-900">Manage Handbook</h1>
          <p className="mt-2 text-gray-600">{sections.length} section(s)</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleNewSection}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
          >
            New Section
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
            {editingId ? "Edit Section" : "New Section"}
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
            <div>
              <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order</label>
              <input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min={0}
                max={10000}
                className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
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
        {sections.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sections.map((section) => (
              <li key={section.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-brand-gold-light text-brand-brown text-sm font-medium mr-4">
                      {section.order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{section.title}</p>
                      <p className="text-xs text-gray-500">/{section.slug}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(section)}
                      className="text-sm text-brand-brown hover:text-brand-brown-light"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(section.id)}
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
            <h3 className="text-sm font-medium text-gray-900">No sections</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a handbook section.</p>
          </div>
        )}
      </div>
    </div>
  )
}
