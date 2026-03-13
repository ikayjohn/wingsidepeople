"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createHash } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function anonymousSurveyToken(userId: string, surveyId: string) {
  return createHash("sha256")
    .update(`${surveyId}:${userId}:${process.env.AUTH_SECRET || "wingernet-surveys"}`)
    .digest("hex")
}

export async function submitSurveyResponse(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const surveyId = z.string().min(1).parse(formData.get("surveyId"))
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, isAnonymous: true, questions: true, isActive: true },
  })
  if (!survey || !survey.isActive) throw new Error("Survey not available")

  const responseToken = survey.isAnonymous ? anonymousSurveyToken(session.user.id, surveyId) : null
  const existingResponse = await prisma.surveyResponse.findFirst({
    where: survey.isAnonymous
      ? { surveyId, responseToken }
      : { surveyId, userId: session.user.id },
    select: { id: true },
  })
  const hasExistingResponse = Boolean(existingResponse)
  if (hasExistingResponse) {
    throw new Error("Survey already submitted")
  }

  const questions = JSON.parse(survey.questions) as Array<{ id: string; prompt: string }>
  const answers = questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: String(formData.get(`answer_${question.id}`) || ""),
  }))

  await prisma.surveyResponse.create({
    data: {
      surveyId,
      userId: survey.isAnonymous ? null : session.user.id,
      responseToken,
      answers: JSON.stringify(answers),
    },
  })

  revalidatePath("/surveys")
  revalidatePath("/admin/surveys")
}
