"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const disciplinaryTypeSchema = z.enum(["verbal_warning", "written_warning", "suspension", "termination", "pip"])
const disciplinarySeveritySchema = z.enum(["minor", "moderate", "serious", "gross"])
const disciplinaryStatusSchema = z.enum(["open", "investigation", "hearing", "resolved", "appealed", "closed"])
const disciplinaryActionSchema = z.enum([
  "verbal_warning_issued",
  "written_warning_issued",
  "meeting_scheduled",
  "pip_started",
  "suspension_served",
  "hearing_date_set",
  "investigation_opened",
  "management_decision_recorded",
])

async function requireDisciplinaryAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "disciplinary")) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function createDisciplinaryCase(formData: FormData) {
  const session = await requireDisciplinaryAccess()
  const employeeId = z.string().min(1).parse(formData.get("employeeId"))
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const type = disciplinaryTypeSchema.parse(formData.get("type"))
  const incidentDate = z.string().min(1).parse(formData.get("incidentDate"))
  const description = z.string().min(5).max(4000).parse(formData.get("description"))
  const severity = disciplinarySeveritySchema.parse(formData.get("severity"))
  const visibleToEmployee = formData.get("visibleToEmployee") === "on"

  await prisma.disciplinaryCase.create({
    data: {
      employeeId,
      managedById: session.user.id,
      title,
      type,
      incidentDate: new Date(`${incidentDate}T00:00:00.000Z`),
      description,
      severity,
      visibleToEmployee,
    },
  })

  revalidatePath("/admin/disciplinary")
  revalidatePath("/disciplinary")
}

export async function updateDisciplinaryCase(formData: FormData) {
  await requireDisciplinaryAccess()
  const caseId = z.string().min(1).parse(formData.get("caseId"))
  const status = disciplinaryStatusSchema.parse(formData.get("status"))
  const outcome = z.string().max(4000).optional().parse(formData.get("outcome") || undefined)
  const appealNotes = z.string().max(4000).optional().parse(formData.get("appealNotes") || undefined)
  const visibleToEmployee = formData.get("visibleToEmployee") === "on"

  await prisma.disciplinaryCase.update({
    where: { id: caseId },
    data: {
      status,
      outcome: outcome || null,
      appealNotes: appealNotes || null,
      visibleToEmployee,
      resolvedAt: status === "resolved" || status === "closed" ? new Date() : null,
    },
  })

  revalidatePath("/admin/disciplinary")
  revalidatePath("/disciplinary")
}

export async function addDisciplinaryAction(formData: FormData) {
  await requireDisciplinaryAccess()
  const caseId = z.string().min(1).parse(formData.get("caseId"))
  const action = disciplinaryActionSchema.parse(formData.get("action"))
  const notes = z.string().max(4000).optional().parse(formData.get("notes") || undefined)
  const dueDateRaw = formData.get("dueDate")
  const dueDate = dueDateRaw ? new Date(`${String(dueDateRaw)}T00:00:00.000Z`) : null
  const completedAt = formData.get("markCompleted") === "on" ? new Date() : null
  const visibleToEmployee = formData.get("visibleToEmployee") === "on"

  await prisma.disciplinaryAction.create({
    data: {
      caseId,
      action,
      notes: notes || null,
      dueDate,
      completedAt,
      visibleToEmployee,
    },
  })

  revalidatePath("/admin/disciplinary")
  revalidatePath("/disciplinary")
}
