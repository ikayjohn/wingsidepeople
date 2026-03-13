"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const offboardingReasonSchema = z.enum(["resignation", "termination", "contract_end", "retirement"])
const offboardingStatusSchema = z.enum(["in_progress", "pending_hr_approval", "completed"])

type OffboardingItem = {
  label: string
  completed: boolean
}

async function requireOffboardingAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "offboarding")) {
    throw new Error("Unauthorized")
  }
  return session
}

function parseItems(itemsRaw: string): OffboardingItem[] {
  return JSON.parse(itemsRaw) as OffboardingItem[]
}

export async function createOffboardingChecklist(formData: FormData) {
  const session = await requireOffboardingAccess()
  const userId = z.string().min(1).parse(formData.get("userId"))
  const reason = offboardingReasonSchema.parse(formData.get("reason"))
  const lastDay = z.string().min(1).parse(formData.get("lastDay"))
  const exitInterviewId = z.string().optional().parse(formData.get("exitInterviewId") || undefined)
  const items = String(formData.get("items") || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label) => ({ label, completed: false }))
  if (items.length === 0) throw new Error("Add at least one checklist item")

  const existingChecklist = await prisma.offboardingChecklist.findFirst({
    where: { userId, status: "in_progress" },
    select: { id: true },
  })
  if (existingChecklist) throw new Error("This employee already has an active offboarding checklist")

  await prisma.offboardingChecklist.create({
    data: {
      userId,
      initiatedById: session.user.id,
      reason,
      lastDay: new Date(`${lastDay}T00:00:00.000Z`),
      items: JSON.stringify(items),
      exitInterviewId: exitInterviewId || null,
      notes: (formData.get("notes") as string) || null,
    },
  })

  revalidatePath("/admin/offboarding")
}

export async function updateOffboardingChecklist(formData: FormData) {
  await requireOffboardingAccess()
  const checklistId = z.string().min(1).parse(formData.get("checklistId"))
  const status = offboardingStatusSchema.parse(formData.get("status"))
  const notes = z.string().max(4000).optional().parse(formData.get("notes") || undefined)
  const exitInterviewId = z.string().optional().parse(formData.get("exitInterviewId") || undefined)

  const checklist = await prisma.offboardingChecklist.findUnique({
    where: { id: checklistId },
    select: { id: true, items: true, finalHrApprovedAt: true },
  })
  if (!checklist) throw new Error("Offboarding checklist not found")

  const items = parseItems(checklist.items)
  const updatedItems = items.map((item, index) => ({
    ...item,
    completed: formData.get(`item_${index}`) === "on",
  }))
  const allItemsCompleted = updatedItems.every((item) => item.completed)

  await prisma.offboardingChecklist.update({
    where: { id: checklistId },
    data: {
      status: status === "completed" ? (checklist.finalHrApprovedAt ? "completed" : "pending_hr_approval") : status,
      items: JSON.stringify(updatedItems),
      notes: notes || null,
      exitInterviewId: exitInterviewId || null,
      completedAt: allItemsCompleted && checklist.finalHrApprovedAt ? new Date() : null,
    },
  })

  revalidatePath("/admin/offboarding")
}

export async function recordExitInterviewCompletion(formData: FormData) {
  await requireOffboardingAccess()
  const checklistId = z.string().min(1).parse(formData.get("checklistId"))

  const checklist = await prisma.offboardingChecklist.findUnique({
    where: { id: checklistId },
    select: { id: true, exitInterviewId: true },
  })
  if (!checklist) throw new Error("Offboarding checklist not found")
  if (!checklist.exitInterviewId) throw new Error("Link an exit interview survey first")

  await prisma.offboardingChecklist.update({
    where: { id: checklistId },
    data: {
      exitInterviewCompletedAt: new Date(),
    },
  })

  revalidatePath("/admin/offboarding")
}

export async function finalizeOffboarding(formData: FormData) {
  const session = await requireOffboardingAccess()
  const checklistId = z.string().min(1).parse(formData.get("checklistId"))
  const finalApprovalNotes = z.string().max(4000).optional().parse(formData.get("finalApprovalNotes") || undefined)

  const checklist = await prisma.offboardingChecklist.findUnique({
    where: { id: checklistId },
    include: {
      user: { select: { id: true } },
    },
  })
  if (!checklist) throw new Error("Offboarding checklist not found")

  const items = parseItems(checklist.items)
  if (!items.every((item) => item.completed)) {
    throw new Error("All clearance checklist items must be completed before final approval")
  }

  const activeAssets = await prisma.assetAssignment.count({
    where: { assignedToId: checklist.user.id, status: "active" },
  })
  if (activeAssets > 0) {
    throw new Error("All assigned assets must be returned before final approval")
  }

  if (checklist.exitInterviewId && !checklist.exitInterviewCompletedAt) {
    throw new Error("Complete the linked exit interview before final approval")
  }

  await prisma.offboardingChecklist.update({
    where: { id: checklistId },
    data: {
      status: "completed",
      assetsClearedAt: checklist.assetsClearedAt || new Date(),
      finalHrApprovedById: session.user.id,
      finalApprovalNotes: finalApprovalNotes || null,
      finalHrApprovedAt: new Date(),
      completedAt: new Date(),
    },
  })

  revalidatePath("/admin/offboarding")
}
