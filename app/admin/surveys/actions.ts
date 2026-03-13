"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const surveyTypeSchema = z.enum([
  "onboarding_experience",
  "job_satisfaction",
  "engagement",
  "pulse",
  "exit",
  "feedback",
])

async function requireSurveysAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "surveys")) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function createSurvey(formData: FormData) {
  const session = await requireSurveysAccess()
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const type = surveyTypeSchema.parse(formData.get("type"))
  const prompts = String(formData.get("questions") || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((prompt, index) => ({ id: `q${index + 1}`, prompt, type: "text" }))
  if (prompts.length === 0) throw new Error("Add at least one survey question")

  await prisma.survey.create({
    data: {
      title,
      description: (formData.get("description") as string) || null,
      type,
      questions: JSON.stringify(prompts),
      isAnonymous: formData.get("isAnonymous") === "on",
      isActive: formData.get("isActive") === "on",
      createdById: session.user.id,
    },
  })

  revalidatePath("/admin/surveys")
  revalidatePath("/surveys")
}
