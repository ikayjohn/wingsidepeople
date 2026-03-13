import { z } from "zod"

export const onboardingItemTypes = [
  "video",
  "reading",
  "document_upload",
  "quiz",
  "signature",
] as const

export type OnboardingItemType = (typeof onboardingItemTypes)[number]

export type OnboardingItemConfig = {
  quizQuestion?: string
  quizOptions?: string[]
  quizAnswer?: string
  signatureLabel?: string
  uploadInstructions?: string
}

const onboardingItemTypeSchema = z.enum(onboardingItemTypes)

const onboardingItemConfigSchema = z.object({
  quizQuestion: z.string().max(500).optional(),
  quizOptions: z.array(z.string().min(1).max(200)).max(6).optional(),
  quizAnswer: z.string().max(200).optional(),
  signatureLabel: z.string().max(200).optional(),
  uploadInstructions: z.string().max(500).optional(),
}).optional().nullable()

export const onboardingItemInputSchema = z.object({
  type: onboardingItemTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  resourceUrl: z.string().url().max(500).nullable().optional(),
  content: z.string().max(10000).nullable().optional(),
  config: onboardingItemConfigSchema,
}).superRefine((item, ctx) => {
  if ((item.type === "video" || item.type === "reading") && !item.resourceUrl && !item.content) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Video and reading steps need a link or content.",
      path: ["resourceUrl"],
    })
  }

  if (item.type === "quiz") {
    const options = item.config?.quizOptions?.filter(Boolean) ?? []
    if (!item.config?.quizQuestion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz steps need a question.",
        path: ["config", "quizQuestion"],
      })
    }
    if (options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz steps need at least two options.",
        path: ["config", "quizOptions"],
      })
    }
    if (!item.config?.quizAnswer || !options.includes(item.config.quizAnswer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz steps need a correct answer that matches one of the options.",
        path: ["config", "quizAnswer"],
      })
    }
  }
})

type WorkflowProgressItem = {
  id: string
  completed: boolean
  item: {
    id: string
    order: number
    type: string
  }
}

type WorkflowChecklist = {
  progress: WorkflowProgressItem[]
}

export function getSortedProgress<T extends WorkflowProgressItem>(progress: T[]) {
  return [...progress].sort((a, b) => a.item.order - b.item.order)
}

export function getNextIncompleteOrder(progress: WorkflowProgressItem[]) {
  const sorted = getSortedProgress(progress)
  const firstPending = sorted.find((entry) => !entry.completed)
  return firstPending?.item.order ?? null
}

export function isProgressUnlocked(progressId: string, progress: WorkflowProgressItem[]) {
  const sorted = getSortedProgress(progress)
  const currentOrder = getNextIncompleteOrder(sorted)
  const entry = sorted.find((item) => item.id === progressId)
  if (!entry) return false
  if (entry.completed) return true
  return currentOrder === null || entry.item.order === currentOrder
}

export function decorateChecklistProgress<T extends WorkflowProgressItem>(checklist: { progress: T[] }) {
  const sorted = getSortedProgress(checklist.progress)
  const currentOrder = getNextIncompleteOrder(sorted)

  return sorted.map((entry) => ({
    ...entry,
    locked: !entry.completed && currentOrder !== null && entry.item.order > currentOrder,
    isCurrent: !entry.completed && currentOrder !== null && entry.item.order === currentOrder,
  }))
}

export function calculateChecklistStats(checklist: WorkflowChecklist) {
  const total = checklist.progress.length
  const completed = checklist.progress.filter((item) => item.completed).length
  const currentOrder = getNextIncompleteOrder(checklist.progress)

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentOrder,
  }
}

export function normalizeItemConfig(config: unknown): OnboardingItemConfig | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null
  const parsed = onboardingItemConfigSchema.safeParse(config)
  return parsed.success ? parsed.data ?? null : null
}

export function isQuizAnswerCorrect(config: unknown, answer: string) {
  const normalized = normalizeItemConfig(config)
  return Boolean(normalized?.quizAnswer && normalized.quizAnswer === answer)
}
