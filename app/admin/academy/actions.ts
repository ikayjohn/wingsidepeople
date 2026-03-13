"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const difficultySchema = z.enum(["beginner", "intermediate", "advanced"])

async function requireAcademyAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "academy")) {
    throw new Error("Unauthorized")
  }
  return session
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function createCourse(formData: FormData) {
  const session = await requireAcademyAccess()
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const category = z.string().min(2).max(60).parse(formData.get("category"))
  const difficulty = difficultySchema.parse(formData.get("difficulty") || "beginner")
  const duration = formData.get("duration") ? z.coerce.number().int().positive().parse(formData.get("duration")) : null
  const modules = lines(formData.get("modules")).map((line, index) => {
    const [moduleTitle, videoUrl, moduleDuration, content, resourceUrl] = line.split("|").map((item) => item.trim())
    if (!moduleTitle) throw new Error("Each module line must start with a module title")
    return {
      title: moduleTitle,
      videoUrl: videoUrl || null,
      duration: moduleDuration ? Number(moduleDuration) : null,
      content: content || null,
      resourceUrl: resourceUrl || null,
      order: index,
    }
  })

  await prisma.course.create({
    data: {
      title,
      description: (formData.get("description") as string) || null,
      category,
      learningPath: (formData.get("learningPath") as string) || null,
      department: (formData.get("department") as string) || null,
      position: (formData.get("position") as string) || null,
      certificateTitle: (formData.get("certificateTitle") as string) || null,
      duration,
      difficulty,
      isPublished: formData.get("isPublished") === "on",
      isMandatory: formData.get("isMandatory") === "on",
      createdById: session.user.id,
      modules: {
        create: modules,
      },
    },
  })

  revalidatePath("/admin/academy")
  revalidatePath("/academy")
}

export async function createAssessment(formData: FormData) {
  await requireAcademyAccess()
  const courseId = z.string().min(1).parse(formData.get("courseId"))
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const passingScore = z.coerce.number().int().min(1).max(100).parse(formData.get("passingScore") || 70)
  const questions = lines(formData.get("questions")).map((line, index) => {
    const [prompt, expectedAnswer] = line.split("|").map((item) => item.trim())
    if (!prompt || !expectedAnswer) {
      throw new Error("Each assessment line must be in 'question | expected answer' format")
    }
    return {
      id: `q${index + 1}`,
      prompt,
      type: "text",
      expectedAnswer,
    }
  })
  if (questions.length === 0) throw new Error("Add at least one assessment question")

  await prisma.assessment.create({
    data: {
      courseId,
      title,
      passingScore,
      questions: JSON.stringify(questions),
    },
  })

  revalidatePath("/admin/academy")
  revalidatePath("/academy")
}

export async function enrollEmployee(formData: FormData) {
  await requireAcademyAccess()
  const courseId = z.string().min(1).parse(formData.get("courseId"))
  const userId = z.string().min(1).parse(formData.get("userId"))

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  })

  revalidatePath("/admin/academy")
  revalidatePath("/academy")
}
