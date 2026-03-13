type EnrollmentLike = {
  completedModules: string | null
  status: string
  completedAt: Date | null
  certificateAwardedAt?: Date | null
}

type AssessmentAttemptLike = {
  passed: boolean | null
  completedAt: Date | null
}

export function parseCompletedModules(value: string | null | undefined) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

export function serializeCompletedModules(completedModuleIds: Iterable<string>) {
  return Array.from(new Set(Array.from(completedModuleIds))).join(",")
}

export function calculateAcademyProgress(params: {
  moduleIds: string[]
  completedModules: Set<string>
  requiresAssessment: boolean
  hasPassedAssessment: boolean
}) {
  const totalSteps = params.moduleIds.length + (params.requiresAssessment ? 1 : 0)
  const completedModuleCount = params.moduleIds.filter((id) => params.completedModules.has(id)).length
  const completedSteps = completedModuleCount + (params.requiresAssessment && params.hasPassedAssessment ? 1 : 0)
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return {
    completedModuleCount,
    totalModules: params.moduleIds.length,
    totalSteps,
    completedSteps,
    progress,
    modulesComplete: params.moduleIds.length > 0 && completedModuleCount === params.moduleIds.length,
    courseComplete: totalSteps > 0 && completedSteps === totalSteps,
  }
}

export function getAssessmentState(attempts: AssessmentAttemptLike[]) {
  const latestAttempt = [...attempts]
    .filter((attempt) => Boolean(attempt.completedAt))
    .sort((a, b) => Number(new Date(b.completedAt || 0)) - Number(new Date(a.completedAt || 0)))[0] ?? null

  return {
    latestAttempt,
    hasPassedAssessment: attempts.some((attempt) => attempt.passed === true),
  }
}

export function getModuleUnlockState(params: {
  moduleIds: string[]
  completedModules: Set<string>
  moduleId: string
}) {
  const index = params.moduleIds.indexOf(params.moduleId)
  if (index <= 0) return true
  const previousModuleId = params.moduleIds[index - 1]
  return params.completedModules.has(previousModuleId)
}

export function shouldAwardCertificate(params: {
  courseComplete: boolean
  certificateTitle: string | null
  enrollment: EnrollmentLike | null
}) {
  return Boolean(params.courseComplete && params.certificateTitle && !params.enrollment?.certificateAwardedAt)
}
