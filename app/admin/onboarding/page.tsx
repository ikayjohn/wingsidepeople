"use client"

import { useCallback, useEffect, useState } from "react"
import type { OnboardingItemType } from "@/lib/onboarding-workflow"

type ItemConfig = {
  quizQuestion?: string
  quizOptions?: string[]
  quizAnswer?: string
  signatureLabel?: string
  uploadInstructions?: string
}

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
  currentStep: { order: number; title: string; type: string } | null
}

type TemplateItemDraft = {
  type: OnboardingItemType
  title: string
  description: string
  resourceUrl: string
  content: string
  config: ItemConfig
}

const itemTypeOptions: { value: OnboardingItemType; label: string; hint: string }[] = [
  { value: "video", label: "Video", hint: "Orientation or role training videos" },
  { value: "reading", label: "Reading", hint: "Policies, manuals, and handbooks" },
  { value: "document_upload", label: "Document Upload", hint: "Collect IDs, certificates, or tax forms" },
  { value: "quiz", label: "Quiz", hint: "Short onboarding assessments" },
  { value: "signature", label: "Signature", hint: "Employment contracts and acknowledgments" },
]

function createDraftItem(): TemplateItemDraft {
  return {
    type: "reading",
    title: "",
    description: "",
    resourceUrl: "",
    content: "",
    config: {},
  }
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
  const [items, setItems] = useState<TemplateItemDraft[]>([createDraftItem()])
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

  const addItem = () => setItems((current) => [...current, createDraftItem()])
  const removeItem = (index: number) => setItems((current) => current.filter((_, i) => i !== index))
  const updateItem = (index: number, updater: (item: TemplateItemDraft) => TemplateItemDraft) => {
    setItems((current) => current.map((item, i) => i === index ? updater(item) : item))
  }

  const resetForm = () => {
    setTitle("")
    setDepartment("")
    setPosition("")
    setItems([createDraftItem()])
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    const validItems = items
      .filter((item) => item.title.trim())
      .map((item) => ({
        type: item.type,
        title: item.title.trim(),
        description: item.description.trim() || null,
        resourceUrl: item.resourceUrl.trim() || null,
        content: item.content.trim() || null,
        config: {
          quizQuestion: item.config.quizQuestion?.trim() || undefined,
          quizOptions: item.config.quizOptions?.map((option) => option.trim()).filter(Boolean),
          quizAnswer: item.config.quizAnswer?.trim() || undefined,
          signatureLabel: item.config.signatureLabel?.trim() || undefined,
          uploadInstructions: item.config.uploadInstructions?.trim() || undefined,
        },
      }))

    if (validItems.length === 0) {
      setError("Add at least one onboarding step")
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
          items: validItems,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create template")
        return
      }

      resetForm()
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
          <p className="mt-2 text-gray-600">Build structured onboarding stages and track employee progress.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover"
          >
            New Workflow
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Onboarding Workflow</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Workflow Title</label>
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
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Workflow Stages</label>
                <button type="button" onClick={addItem} className="text-sm text-brand-brown hover:text-brand-brown-light">
                  + Add stage
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Stage {index + 1}</p>
                        <p className="text-xs text-gray-500">Employees must complete stages in order.</p>
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600 hover:text-red-800">
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Stage Type</label>
                        <select
                          value={item.type}
                          onChange={(e) => updateItem(index, (current) => ({
                            ...current,
                            type: e.target.value as OnboardingItemType,
                            resourceUrl: "",
                            content: "",
                            config: {},
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                        >
                          {itemTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {itemTypeOptions.find((option) => option.value === item.type)?.hint}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Stage Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(index, (current) => ({ ...current, title: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, (current) => ({ ...current, description: e.target.value }))}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                      />
                    </div>

                    {(item.type === "video" || item.type === "reading") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Link (optional)</label>
                          <input
                            type="url"
                            value={item.resourceUrl}
                            onChange={(e) => updateItem(index, (current) => ({ ...current, resourceUrl: e.target.value }))}
                            placeholder="https://..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Inline Content (optional)</label>
                          <textarea
                            value={item.content}
                            onChange={(e) => updateItem(index, (current) => ({ ...current, content: e.target.value }))}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                          />
                        </div>
                      </div>
                    )}

                    {item.type === "document_upload" && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Upload Instructions</label>
                        <textarea
                          value={item.config.uploadInstructions || ""}
                          onChange={(e) => updateItem(index, (current) => ({
                            ...current,
                            config: { ...current.config, uploadInstructions: e.target.value },
                          }))}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                        />
                      </div>
                    )}

                    {item.type === "quiz" && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Question</label>
                          <input
                            type="text"
                            value={item.config.quizQuestion || ""}
                            onChange={(e) => updateItem(index, (current) => ({
                              ...current,
                              config: { ...current.config, quizQuestion: e.target.value },
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Answer Options (one per line)</label>
                          <textarea
                            value={(item.config.quizOptions || []).join("\n")}
                            onChange={(e) => updateItem(index, (current) => ({
                              ...current,
                              config: { ...current.config, quizOptions: e.target.value.split("\n") },
                            }))}
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                          <input
                            type="text"
                            value={item.config.quizAnswer || ""}
                            onChange={(e) => updateItem(index, (current) => ({
                              ...current,
                              config: { ...current.config, quizAnswer: e.target.value },
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                          />
                        </div>
                      </div>
                    )}

                    {item.type === "signature" && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Signature Prompt</label>
                        <input
                          type="text"
                          value={item.config.signatureLabel || ""}
                          onChange={(e) => updateItem(index, (current) => ({
                            ...current,
                            config: { ...current.config, signatureLabel: e.target.value },
                          }))}
                          placeholder="Type your full name to sign"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-brown bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Workflow"}
              </button>
              <button
                type="button"
                onClick={() => { setError(""); resetForm() }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {templates.length > 0 && employees.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assign Workflow</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="assignTemplate" className="block text-sm font-medium text-gray-700">Workflow</label>
              <select
                id="assignTemplate"
                value={assignTemplateId}
                onChange={(e) => setAssignTemplateId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
              >
                <option value="">Select workflow...</option>
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
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name || employee.email}</option>
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

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Templates</h2>
      <div className="bg-white shadow rounded-lg mb-8">
        {templates.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{template.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {template._count.items} stages · {template._count.checklists} assigned
                      {template.department && ` · ${template.department}`}
                      {template.position && ` · ${template.position}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(template.id)}
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
            <h3 className="text-sm font-medium text-gray-900">No workflows</h3>
            <p className="mt-1 text-sm text-gray-500">Create a workflow to start onboarding new employees.</p>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Employee Progress</h2>
      <div className="bg-white shadow rounded-lg">
        {progress.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {progress.map((entry) => (
              <li key={entry.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.user.name || entry.user.email}</p>
                    <p className="text-xs text-gray-500">{entry.template.title}</p>
                  </div>
                  <span className="text-sm text-gray-600">{entry.completed}/{entry.total} ({entry.percentage}%)</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`rounded-full h-2 ${entry.percentage === 100 ? "bg-green-500" : "bg-brand-gold"}`}
                    style={{ width: `${entry.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {entry.currentStep
                    ? `Current stage: ${entry.currentStep.title} (${entry.currentStep.type.replace("_", " ")})`
                    : "Workflow completed"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No workflows assigned</h3>
            <p className="mt-1 text-sm text-gray-500">Assign a workflow to an employee above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
