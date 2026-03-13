import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { buildStoredFilenameFromMime, isAllowedDocumentMime, uploadsDir } from "@/lib/document-storage"
import { isProgressUnlocked, isQuizAnswerCorrect } from "@/lib/onboarding-workflow"

const completionSchema = z.object({
  answer: z.string().max(500).optional(),
  signature: z.string().max(200).optional(),
})

const checklistProgressInclude = Prisma.validator<Prisma.ChecklistProgressInclude>()({
  item: true,
  checklist: {
    include: {
      progress: {
        include: {
          item: true,
        },
      },
    },
  },
})

async function getAuthorizedProgress(progressId: string, userId: string) {
  const progress = await prisma.checklistProgress.findUnique({
    where: { id: progressId },
    include: checklistProgressInclude,
  })

  if (!progress) {
    return { error: NextResponse.json({ error: "Progress item not found" }, { status: 404 }) }
  }

  if (progress.checklist.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  if (!isProgressUnlocked(progress.id, progress.checklist.progress)) {
    return { error: NextResponse.json({ error: "Complete the current onboarding step first." }, { status: 409 }) }
  }

  return { progress }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ progressId: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { progressId } = await params
  const lookup = await getAuthorizedProgress(progressId, session!.user.id)
  if (lookup.error) return lookup.error

  const progress = lookup.progress

  if (progress.item.type === "document_upload") {
    return NextResponse.json({ error: "Use file upload for this onboarding step." }, { status: 400 })
  }

  try {
    const payload = completionSchema.parse(await req.json())

    if (progress.item.type === "quiz") {
      const answer = payload.answer?.trim()
      if (!answer) {
        return NextResponse.json({ error: "Select an answer to continue." }, { status: 400 })
      }
      if (!isQuizAnswerCorrect(progress.item.config, answer)) {
        return NextResponse.json({ error: "Incorrect answer. Review the material and try again." }, { status: 400 })
      }
    }

    if (progress.item.type === "signature") {
      const signature = payload.signature?.trim()
      if (!signature) {
        return NextResponse.json({ error: "Enter your digital signature to continue." }, { status: 400 })
      }
    }

    const updated = await prisma.checklistProgress.update({
      where: { id: progressId },
      data: {
        completed: true,
        completedAt: new Date(),
        submissionText: progress.item.type === "signature"
          ? payload.signature?.trim() ?? null
          : progress.item.type === "quiz"
            ? payload.answer?.trim() ?? null
            : progress.item.type === "video" || progress.item.type === "reading"
              ? "completed"
              : null,
        submissionData: progress.item.type === "quiz"
          ? { answer: payload.answer?.trim() ?? null }
          : progress.item.type === "signature"
            ? { signature: payload.signature?.trim() ?? null }
            : undefined,
      },
      select: {
        id: true,
        completed: true,
        completedAt: true,
        submissionText: true,
        submissionData: true,
        uploadedFilename: true,
        uploadedFilepath: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update onboarding progress" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ progressId: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { progressId } = await params
  const lookup = await getAuthorizedProgress(progressId, session!.user.id)
  if (lookup.error) return lookup.error

  const progress = lookup.progress
  if (progress.item.type !== "document_upload") {
    return NextResponse.json({ error: "This onboarding step does not accept file uploads." }, { status: 400 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a file to continue." }, { status: 400 })
    }
    if (!file.type || !isAllowedDocumentMime(file.type)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be 10 MB or smaller." }, { status: 400 })
    }

    const filename = buildStoredFilenameFromMime(file.type)
    await mkdir(uploadsDir, { recursive: true })
    const filepath = path.resolve(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const updated = await prisma.checklistProgress.update({
      where: { id: progressId },
      data: {
        completed: true,
        completedAt: new Date(),
        submissionText: file.name,
        submissionData: { originalName: file.name },
        uploadedFilename: file.name,
        uploadedFilepath: `/uploads/${filename}`,
        uploadedFilesize: file.size,
        uploadedMimetype: file.type,
      },
      select: {
        id: true,
        completed: true,
        completedAt: true,
        uploadedFilename: true,
        uploadedFilepath: true,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to upload onboarding document" }, { status: 500 })
  }
}
