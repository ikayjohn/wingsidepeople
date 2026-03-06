"use client"

import { useCallback, useEffect, useState } from "react"

interface DocumentItem {
  id: string
  title: string
  description: string | null
  category: string
  version: number
  filename: string
  filesize: number
  createdAt: string
  versions: { id: string; version: number; createdAt: string }[]
}

const CATEGORIES = [
  { value: "forms", label: "Forms" },
  { value: "templates", label: "Templates" },
  { value: "guides", label: "Guides" },
  { value: "policies", label: "Policies" },
  { value: "benefits", label: "Benefits" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
]

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("forms")
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/documents")
      if (!res.ok) throw new Error("Failed to fetch documents")
      const data = await res.json()
      setDocuments(data)
    } catch {
      setError("Failed to fetch documents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("forms")
    setFile(null)
    setDocumentId("")
    setShowForm(false)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file")
      return
    }

    setSaving(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("category", category)
      formData.append("file", file)
      if (documentId) formData.append("documentId", documentId)

      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to upload document")
        return
      }

      resetForm()
      await fetchDocuments()
    } catch {
      setError("Failed to upload document")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" })
      if (res.ok) {
        await fetchDocuments()
      } else {
        setError("Failed to delete document")
      }
    } catch {
      setError("Failed to delete document")
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Documents</h1>
          <p className="mt-2 text-gray-600">{documents.length} document(s)</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
          >
            Upload Document
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">{documentId ? "Upload New Version" : "Upload Document"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {documents.length > 0 && (
              <div>
                <label htmlFor="documentId" className="block text-sm font-medium text-gray-700">Replace Existing Document (optional)</label>
                <select
                  id="documentId"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                >
                  <option value="">Create as a new document</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} (current v{doc.version})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
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
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">File</label>
              <input
                id="file"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum file size: 10 MB</p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saving ? "Uploading..." : "Upload"}
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
        {documents.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {doc.category} • v{doc.version} • {(doc.filesize / 1024).toFixed(0)} KB • {doc.filename}
                    </p>
                    {doc.versions.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Previous versions: {doc.versions.map((v) => `v${v.version}`).join(", ")}
                      </p>
                    )}
                    {doc.description && (
                      <p className="mt-1 text-sm text-gray-600">{doc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-brown hover:text-brand-brown-light"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
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
            <h3 className="text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a document.</p>
          </div>
        )}
      </div>
    </div>
  )
}
