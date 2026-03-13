"use client"

import { useEffect, useState } from "react"
import type { OnboardingItemType } from "@/lib/onboarding-workflow"

type ItemConfig = {
  quizQuestion?: string
  quizOptions?: string[]
  quizAnswer?: string
  signatureLabel?: string
  uploadInstructions?: string
} | null

interface ProgressItem {
  id: string
  completed: boolean
  completedAt: string | null
  submissionText: string | null
  uploadedFilename?: string | null
  uploadedFilepath?: string | null
  locked: boolean
  isCurrent: boolean
  item: {
    id: string
    title: string
    description: string | null
    order: number
    type: OnboardingItemType
    resourceUrl: string | null
    content: string | null
    config: ItemConfig
  }
}

interface Checklist {
  id: string
  assignedAt: string
  total: number
  completed: number
  percentage: number
  template: {
    id: string
    title: string
    department: string | null
    position: string | null
  }
  progress: ProgressItem[]
}

type SubmissionState = {
  answer?: string
  signature?: string
  file?: File | null
}

const itemTypeLabels: Record<OnboardingItemType, string> = {
  video: "Video",
  reading: "Reading",
  document_upload: "Document Upload",
  quiz: "Quiz",
  signature: "Signature",
}

export default function OnboardingPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submissions, setSubmissions] = useState<Record<string, SubmissionState>>({})
  const [busyId, setBusyId] = useState("")

  const fetchChecklists = async () => {
    try {
      const res = await fetch("/api/onboarding/my-checklists")
      if (!res.ok) throw new Error("Failed to fetch onboarding")
      setChecklists(await res.json())
    } catch {
      setError("Failed to load onboarding workflow")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChecklists()
  }, [])

  const updateSubmission = (progressId: string, patch: SubmissionState) => {
    setSubmissions((current) => ({
      ...current,
      [progressId]: {
        ...current[progressId],
        ...patch,
      },
    }))
  }

  const completeStep = async (progress: ProgressItem) => {
    setBusyId(progress.id)
    setError("")

    try {
      if (progress.item.type === "document_upload") {
        const file = submissions[progress.id]?.file
        if (!file) {
          setError("Select a file before submitting this step.")
          return
        }

        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch(`/api/onboarding/progress/${progress.id}`, {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to upload file")
          return
        }
      } else {
        const res = await fetch(`/api/onboarding/progress/${progress.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answer: submissions[progress.id]?.answer,
            signature: submissions[progress.id]?.signature,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to complete onboarding step")
          return
        }
      }

      await fetchChecklists()
      setSubmissions((current) => ({ ...current, [progress.id]: {} }))
    } catch {
      setError("Failed to complete onboarding step")
    } finally {
      setBusyId("")
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Onboarding</h1>
        <p className="mt-2 text-gray-600">Complete each onboarding stage in order. New stages unlock automatically.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {checklists.length > 0 ? (
        <div className="space-y-6">
          {checklists.map((checklist) => (
            <div key={checklist.id} className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{checklist.template.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {checklist.completed}/{checklist.total} stages completed
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{checklist.percentage}%</span>
                </div>
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div
                    className={`rounded-full h-2 transition-all ${checklist.percentage === 100 ? "bg-green-500" : "bg-brand-gold"}`}
                    style={{ width: `${checklist.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Assigned {new Date(checklist.assignedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {checklist.progress.map((progress) => (
                  <div key={progress.id} className={`px-4 py-4 sm:px-6 ${progress.locked ? "bg-gray-50" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            progress.completed
                              ? "bg-green-100 text-green-700"
                              : progress.locked
                                ? "bg-gray-200 text-gray-600"
                                : "bg-brand-gold-light text-brand-brown"
                          }`}>
                            {progress.completed ? "Completed" : progress.locked ? "Locked" : progress.isCurrent ? "Current Stage" : "Ready"}
                          </span>
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {itemTypeLabels[progress.item.type]}
                          </span>
                          <span className="text-xs text-gray-400">Stage {progress.item.order + 1}</span>
                        </div>

                        <p className={`mt-2 text-sm font-medium ${progress.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                          {progress.item.title}
                        </p>

                        {progress.item.description && (
                          <p className="text-sm text-gray-600 mt-1">{progress.item.description}</p>
                        )}

                        {progress.item.resourceUrl && (
                          <a
                            href={progress.item.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex mt-3 text-sm font-medium text-brand-brown hover:text-brand-brown-light"
                          >
                            Open resource
                          </a>
                        )}

                        {progress.item.content && (
                          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">
                            {progress.item.content}
                          </div>
                        )}

                        {progress.item.type === "quiz" && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-800">{progress.item.config?.quizQuestion}</p>
                            <div className="mt-2 space-y-2">
                              {(progress.item.config?.quizOptions || []).map((option) => (
                                <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="radio"
                                    name={`quiz-${progress.id}`}
                                    value={option}
                                    disabled={progress.locked || progress.completed}
                                    checked={submissions[progress.id]?.answer === option}
                                    onChange={(e) => updateSubmission(progress.id, { answer: e.target.value })}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {progress.item.type === "signature" && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">
                              {progress.item.config?.signatureLabel || "Type your full name to sign"}
                            </label>
                            <input
                              type="text"
                              value={submissions[progress.id]?.signature || ""}
                              disabled={progress.locked || progress.completed}
                              onChange={(e) => updateSubmission(progress.id, { signature: e.target.value })}
                              className="mt-1 block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm border px-3 py-2"
                            />
                          </div>
                        )}

                        {progress.item.type === "document_upload" && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-700">
                              {progress.item.config?.uploadInstructions || "Upload the required onboarding document."}
                            </p>
                            <input
                              type="file"
                              disabled={progress.locked || progress.completed}
                              onChange={(e) => updateSubmission(progress.id, { file: e.target.files?.[0] || null })}
                              className="mt-2 block w-full max-w-md text-sm text-gray-700"
                            />
                            {progress.uploadedFilename && (
                              <p className="mt-2 text-sm text-gray-600">
                                Uploaded file: {progress.uploadedFilename}
                              </p>
                            )}
                          </div>
                        )}

                        {(progress.item.type === "video" || progress.item.type === "reading") && !progress.completed && !progress.locked && (
                          <p className="mt-3 text-xs text-gray-500">Review the material, then mark this stage complete.</p>
                        )}

                        {progress.completedAt && (
                          <p className="text-xs text-gray-400 mt-3">
                            Completed {new Date(progress.completedAt).toLocaleDateString()}
                            {progress.submissionText ? ` · ${progress.submissionText}` : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <button
                          onClick={() => completeStep(progress)}
                          disabled={progress.locked || progress.completed || busyId === progress.id}
                          className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-brown shadow-sm hover:bg-brand-gold-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {progress.completed ? "Completed" : busyId === progress.id ? "Saving..." : "Complete Stage"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No onboarding workflows assigned to you yet.
          </div>
        </div>
      )}
    </div>
  )
}
