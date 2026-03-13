"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateAcademyProgress, getAssessmentState, getModuleUnlockState, parseCompletedModules, serializeCompletedModules } from "@/lib/academy"

async function requireEmployee() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  return session
}

export async function enrollInCourse(formData: FormData) {
  const session = await requireEmployee()

  const courseId = z.string().min(1).parse(formData.get("courseId"))
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, isPublished: true },
  })
  if (!course || !course.isPublished) throw new Error("Course not available")

  const existingEnrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    select: { id: true, status: true },
  })

  if (!existingEnrollment) {
    await prisma.courseEnrollment.create({
      data: { userId: session.user.id, courseId, status: "in_progress" },
    })
  } else if (existingEnrollment.status === "enrolled") {
    await prisma.courseEnrollment.update({
      where: { id: existingEnrollment.id },
      data: { status: "in_progress" },
    })
  }

  revalidatePath("/academy")
}

export async function completeModule(formData: FormData) {
  const session = await requireEmployee()
  const courseId = z.string().min(1).parse(formData.get("courseId"))
  const moduleId = z.string().min(1).parse(formData.get("moduleId"))

  const [course, enrollment, attempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: { orderBy: { order: "asc" }, select: { id: true } },
        assessments: { select: { id: true } },
      },
    }),
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
      select: { id: true, completedModules: true, status: true, completedAt: true, certificateAwardedAt: true },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId: session.user.id, assessment: { courseId } },
      select: { passed: true, completedAt: true },
    }),
  ])

  if (!course || !course.isPublished) throw new Error("Course not available")
  const moduleIds = course.modules.map((module) => module.id)
  if (!moduleIds.includes(moduleId)) throw new Error("Module not found")

  const completedModules = parseCompletedModules(enrollment?.completedModules)
  if (!getModuleUnlockState({ moduleIds, completedModules, moduleId })) {
    throw new Error("Complete the previous module first")
  }

  completedModules.add(moduleId)
  const assessmentState = getAssessmentState(attempts)
  const progressState = calculateAcademyProgress({
    moduleIds,
    completedModules,
    requiresAssessment: course.assessments.length > 0,
    hasPassedAssessment: assessmentState.hasPassedAssessment,
  })

  const now = new Date()
  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    update: {
      completedModules: serializeCompletedModules(completedModules),
      progress: progressState.progress,
      status: progressState.courseComplete ? "completed" : "in_progress",
      completedAt: progressState.courseComplete ? (enrollment?.completedAt ?? now) : null,
      certificateAwardedAt: progressState.courseComplete && course.certificateTitle
        ? (enrollment?.certificateAwardedAt ?? now)
        : null,
    },
    create: {
      userId: session.user.id,
      courseId,
      completedModules: serializeCompletedModules(completedModules),
      progress: progressState.progress,
      status: progressState.courseComplete ? "completed" : "in_progress",
      completedAt: progressState.courseComplete ? now : null,
      certificateAwardedAt: progressState.courseComplete && course.certificateTitle ? now : null,
    },
  })

  revalidatePath("/academy")
}

export async function submitAssessment(formData: FormData) {
  const session = await requireEmployee()

  const assessmentId = z.string().min(1).parse(formData.get("assessmentId"))
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      questions: true,
      passingScore: true,
      courseId: true,
      course: {
        select: {
          isPublished: true,
          certificateTitle: true,
          modules: { orderBy: { order: "asc" }, select: { id: true } },
          assessments: { select: { id: true } },
        },
      },
    },
  })
  if (!assessment || !assessment.course.isPublished) throw new Error("Assessment not available")

  const questions = JSON.parse(assessment.questions) as Array<{ id: string; prompt: string; expectedAnswer?: string }>
  if (questions.length === 0) throw new Error("Assessment has no questions configured")
  const answers = questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: String(formData.get(`answer_${question.id}`) || ""),
  }))
  const correctCount = answers.filter((item, index) => {
    const expected = questions[index]?.expectedAnswer?.trim().toLowerCase()
    if (!expected) return false
    return item.answer.trim().toLowerCase() === expected
  }).length
  const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0
  const passed = score >= assessment.passingScore

  await prisma.$transaction(async (tx) => {
    const existingEnrollment = await tx.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: assessment.courseId } },
      select: { id: true, progress: true, status: true, completedAt: true, completedModules: true, certificateAwardedAt: true },
    })

    await tx.assessmentAttempt.create({
      data: {
        assessmentId,
        userId: session.user.id,
        answers: JSON.stringify(answers),
        score,
        passed,
        completedAt: new Date(),
      },
    })

    const completedModules = parseCompletedModules(existingEnrollment?.completedModules)
    const progressState = calculateAcademyProgress({
      moduleIds: assessment.course.modules.map((module) => module.id),
      completedModules,
      requiresAssessment: assessment.course.assessments.length > 0,
      hasPassedAssessment: passed || existingEnrollment?.status === "completed",
    })

    const completedAt = progressState.courseComplete ? (existingEnrollment?.completedAt ?? new Date()) : null

    await tx.courseEnrollment.upsert({
      where: { userId_courseId: { userId: session.user.id, courseId: assessment.courseId } },
      update: {
        progress: Math.max(existingEnrollment?.progress ?? 0, progressState.progress),
        status: progressState.courseComplete ? "completed" : "in_progress",
        completedAt,
        certificateAwardedAt: progressState.courseComplete && assessment.course.certificateTitle
          ? (existingEnrollment?.certificateAwardedAt ?? new Date())
          : null,
      },
      create: {
        userId: session.user.id,
        courseId: assessment.courseId,
        completedModules: serializeCompletedModules(completedModules),
        progress: progressState.progress,
        status: progressState.courseComplete ? "completed" : "in_progress",
        completedAt,
        certificateAwardedAt: progressState.courseComplete && assessment.course.certificateTitle ? new Date() : null,
      },
    })
  })

  revalidatePath("/academy")
}
