"use client"

import { useState, useEffect, useCallback } from "react"

interface Template {
  id: string
  title: string
  department: string | null
  position: string | null
  isDefault: boolean
  createdAt: string
  _count: { items: number; checklists: number }
}

interface Employee {
  id: string
  name: string | null
  email: string
}

interface ProgressEntry {
  id: string
  user: Employee
  template: { id: string; title: string }
  assignedAt: string
  total: number
  completed: number
  percentage: number
}

export default function AdminOnboardingPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [position, setPosition] = useState("")
  const [items, setItems] = useState([{ title: "", description: "" }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [assignTemplateId, setAssignTemplateId] = useState("")
  const [assignUserId, setAssignUserId] = useState("")
  const [assigning, setAssigning] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/admin/onboarding/templates"),
        fetch("/api/admin/onboarding/progress"),
      ])
      if (tRes.ok) setTemplates(await tRes.json())
      if (pRes.ok) setProgress(await pRes.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/admin/employees")
        if (res.ok) setEmployees(await res.json())
      } catch {
        // ignore
      }
    }
    fetchEmployees()
  }, [])

  const addItem = () => setItems([...items, { title: "", description: "" }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: "title" | "description", value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    const validItems = items.filter((i) => i.title.trim())
    if (validItems.length === 0) {
      setError("Add at least one checklist item")
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/onboarding/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          department: department || null,
          position: position || null,
          items: validItems.map((i) => ({
            title: i.title,
            description: i.description || null,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create template")
        return
      }

      setTitle("")
      setDepartment("")
      setPosition("")
      setItems([{ title: "", description: "" }])
      setShowForm(false)
      fetchData()
    } catch {
      setError("Failed to create template")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template and all related checklists?")) return
    try {
      await fetch(`/api/admin/onboarding/templates/${id}`, { method: "DELETE" })
      fetchData()
    } catch {
      setError("Failed to delete template")
    }
  }

  const handleAssign = async () => {
    if (!assignTemplateId || !assignUserId) return
    setAssigning(true)
    setError("")

    try {
      const res = await fetch("/api/admin/onboarding/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: assignTemplateId, userId: assignUserId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to assign")
        return
      }

      setAssignTemplateId("")
      setAssignUserId("")
      fetchData()
    } catch {
      setError("Failed to assign checklist")
    } finally {
      setAssigning(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Onboarding</h1>
          <p className="mt-2 text-gray-600">Manage templates and track employee progress</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
          >
            New Template
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Template</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department (optional)</label>
                <input
                  id="department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position (optional)</label>
                <input
                  id="position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Item title"
                    value={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 px-2">
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-sm text-brand-brown hover:text-brand-brown-light">
                + Add item
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Template"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError("") }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign checklist */}
      {templates.length > 0 && employees.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assign Checklist</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="assignTemplate" className="block text-sm font-medium text-gray-700">Template</label>
              <select
                id="assignTemplate"
                value={assignTemplateId}
                onChange={(e) => setAssignTemplateId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              >
                <option value="">Select template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="assignUser" className="block text-sm font-medium text-gray-700">Employee</label>
              <select
                id="assignUser"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              >
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name || e.email}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              disabled={assigning || !assignTemplateId || !assignUserId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
            >
              {assigning ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Templates</h2>
      <div className="bg-white shadow rounded-lg mb-8">
        {templates.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {templates.map((t) => (
              <li key={t.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t._count.items} items &middot; {t._count.checklists} assigned
                      {t.department && ` \u00B7 ${t.department}`}
                      {t.position && ` \u00B7 ${t.position}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">Create a template to get started.</p>
          </div>
        )}
      </div>

      {/* Progress tracking */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Employee Progress</h2>
      <div className="bg-white shadow rounded-lg">
        {progress.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {progress.map((p) => (
              <li key={p.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.user.name || p.user.email}</p>
                    <p className="text-xs text-gray-500">{p.template.title}</p>
                  </div>
                  <span className="text-sm text-gray-600">{p.completed}/{p.total} ({p.percentage}%)</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`rounded-full h-2 ${p.percentage === 100 ? "bg-green-500" : "bg-brand-gold"}`}
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No checklists assigned</h3>
            <p className="mt-1 text-sm text-gray-500">Assign a template to an employee above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
