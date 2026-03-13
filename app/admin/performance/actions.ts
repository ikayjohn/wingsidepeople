"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection, normalizeRole } from "@/lib/rbac"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import { buildStoredFilenameFromMime, isAllowedDocumentMime, sanitizeOriginalFilename, uploadsDir } from "@/lib/document-storage"

const reviewTypeSchema = z.enum(["quarterly", "mid_year", "annual", "probation"])
const currentValueSchema = z.coerce.number()
const MAX_FILE_SIZE = 10 * 1024 * 1024

async function requirePerformanceAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "performance")) {
    throw new Error("Unauthorized")
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, department: true },
  })
  if (!actor) throw new Error("Unauthorized")
  return actor
}

function parseUtcDate(value: FormDataEntryValue | null, field: string) {
  const parsed = z.string().min(1, `${field} is required`).parse(value)
  return new Date(`${parsed}T00:00:00.000Z`)
}

function canManageCompanyGoals(role: string) {
  return ["hr", "admin", "super_admin"].includes(role)
}

export async function createGoal(formData: FormData) {
  const actor = await requirePerformanceAccess()
  if (!canManageCompanyGoals(actor.role)) throw new Error("Only HR or admins can create company goals")

  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const unit = z.string().max(30).optional().parse(formData.get("unit") || undefined)
  const targetValue = z.coerce.number().optional().parse(formData.get("targetValue") || undefined)
  const startDate = parseUtcDate(formData.get("startDate"), "Start date")
  const endDate = parseUtcDate(formData.get("endDate"), "End date")
  if (endDate < startDate) throw new Error("End date must be on or after start date")

  await prisma.companyGoal.create({
    data: {
      title,
      unit: unit || null,
      targetValue: targetValue ?? null,
      startDate,
      endDate,
    },
  })

  revalidatePath("/admin/performance")
}

export async function updateGoalProgress(formData: FormData) {
  const actor = await requirePerformanceAccess()
  if (!canManageCompanyGoals(actor.role)) throw new Error("Only HR or admins can update company goals")

  const goalId = z.string().min(1).parse(formData.get("goalId"))
  const currentValue = currentValueSchema.parse(formData.get("currentValue"))
  const status = z.string().optional().parse(formData.get("status") || undefined)

  await prisma.companyGoal.update({
    where: { id: goalId },
    data: {
      currentValue,
      status: status || undefined,
    },
  })

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}

export async function createDepartmentKpi(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const departmentId = z.string().min(1).parse(formData.get("departmentId"))
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const periodStart = parseUtcDate(formData.get("startDate"), "Start date")
  const periodEnd = parseUtcDate(formData.get("endDate"), "End date")
  if (periodEnd < periodStart) throw new Error("End date must be on or after start date")

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true },
  })
  if (!department) throw new Error("Department not found")
  if (normalizeRole(actor.role) === "manager" && actor.department !== department.name) {
    throw new Error("Managers can only create KPIs for their own department")
  }

  await prisma.departmentKpi.create({
    data: {
      departmentId,
      companyGoalId: (formData.get("companyGoalId") as string) || null,
      title,
      description: (formData.get("description") as string) || null,
      targetValue: formData.get("targetValue") ? Number(formData.get("targetValue")) : null,
      unit: (formData.get("unit") as string) || null,
      startDate: periodStart,
      endDate: periodEnd,
    },
  })

  revalidatePath("/admin/performance")
}

export async function updateDepartmentKpiProgress(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const departmentKpiId = z.string().min(1).parse(formData.get("departmentKpiId"))
  const currentValue = currentValueSchema.parse(formData.get("currentValue"))
  const status = z.string().optional().parse(formData.get("status") || undefined)

  const kpi = await prisma.departmentKpi.findUnique({
    where: { id: departmentKpiId },
    include: { department: { select: { name: true } } },
  })
  if (!kpi) throw new Error("Department KPI not found")
  if (normalizeRole(actor.role) === "manager" && actor.department !== kpi.department.name) {
    throw new Error("Managers can only update KPIs for their own department")
  }

  await prisma.departmentKpi.update({
    where: { id: departmentKpiId },
    data: {
      currentValue,
      status: status || undefined,
    },
  })

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}

export async function createEmployeeKpi(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const userId = z.string().min(1).parse(formData.get("userId"))
  const title = z.string().min(2).max(120).parse(formData.get("title"))
  const period = z.string().min(2).max(40).parse(formData.get("period"))

  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, department: true, managerId: true },
  })
  if (!employee) throw new Error("Employee not found")
  if (normalizeRole(actor.role) === "manager") {
    const managesEmployee = employee.managerId === actor.id || employee.department === actor.department
    if (!managesEmployee) throw new Error("Managers can only assign KPIs to their team")
  }

  await prisma.employeeKpi.create({
    data: {
      userId,
      departmentKpiId: (formData.get("departmentKpiId") as string) || null,
      title,
      description: (formData.get("description") as string) || null,
      period,
      targetValue: formData.get("targetValue") ? Number(formData.get("targetValue")) : null,
      unit: (formData.get("unit") as string) || null,
    },
  })

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}

export async function updateEmployeeKpiProgress(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const kpiId = z.string().min(1).parse(formData.get("kpiId"))
  const currentValue = currentValueSchema.parse(formData.get("currentValue"))
  const selfRating = formData.get("selfRating") ? Number(formData.get("selfRating")) : null

  const kpi = await prisma.employeeKpi.findUnique({
    where: { id: kpiId },
    include: {
      user: { select: { id: true, department: true, managerId: true } },
    },
  })
  if (!kpi) throw new Error("Employee KPI not found")

  const role = normalizeRole(actor.role)
  if (role === "manager") {
    const managesEmployee = kpi.user.managerId === actor.id || kpi.user.department === actor.department
    if (!managesEmployee) throw new Error("Managers can only update KPIs for their team")
  }

  await prisma.employeeKpi.update({
    where: { id: kpiId },
    data: {
      currentValue,
      selfRating,
    },
  })

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}

export async function createPerformanceReview(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const userId = z.string().min(1).parse(formData.get("userId"))
  const period = z.string().min(2).max(40).parse(formData.get("period"))
  const type = reviewTypeSchema.parse(formData.get("type"))

  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, department: true, managerId: true },
  })
  if (!employee) throw new Error("Employee not found")
  if (normalizeRole(actor.role) === "manager") {
    const managesEmployee = employee.managerId === actor.id || employee.department === actor.department
    if (!managesEmployee) throw new Error("Managers can only review their team")
  }

  await prisma.performanceReview.upsert({
    where: { userId_period_type: { userId, period, type } },
    update: {
      reviewerId: actor.id,
      overallRating: formData.get("overallRating") ? Number(formData.get("overallRating")) : null,
      strengths: (formData.get("strengths") as string) || null,
      improvements: (formData.get("improvements") as string) || null,
      goals: (formData.get("goals") as string) || null,
      comments: (formData.get("comments") as string) || null,
      status: "submitted",
      submittedAt: new Date(),
    },
    create: {
      userId,
      reviewerId: actor.id,
      period,
      type,
      overallRating: formData.get("overallRating") ? Number(formData.get("overallRating")) : null,
      strengths: (formData.get("strengths") as string) || null,
      improvements: (formData.get("improvements") as string) || null,
      goals: (formData.get("goals") as string) || null,
      comments: (formData.get("comments") as string) || null,
      status: "submitted",
      submittedAt: new Date(),
    },
  })

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}

export async function uploadDepartmentStrategy(formData: FormData) {
  const actor = await requirePerformanceAccess()
  const departmentId = z.string().min(1).parse(formData.get("departmentId"))
  const title = z.string().min(2).max(200).parse(formData.get("title"))
  const summary = z.string().max(4000).optional().parse(formData.get("summary") || undefined)
  const rawFile = formData.get("file")
  const file = rawFile instanceof File ? rawFile : null

  if (!file) throw new Error("Strategy document is required")
  if (!file.type || !isAllowedDocumentMime(file.type)) throw new Error("Unsupported file type")
  if (file.size > MAX_FILE_SIZE) throw new Error("File must be 10 MB or smaller")

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true },
  })
  if (!department) throw new Error("Department not found")
  if (normalizeRole(actor.role) === "manager" && actor.department !== department.name) {
    throw new Error("Managers can only manage strategy for their own department")
  }

  let writtenFilePath: string | null = null
  try {
    const filename = buildStoredFilenameFromMime(file.type)
    await mkdir(uploadsDir, { recursive: true })
    const filepath = path.resolve(uploadsDir, filename)
    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
    writtenFilePath = filepath

    await prisma.departmentStrategy.create({
      data: {
        departmentId,
        title,
        summary: summary || null,
        filename: sanitizeOriginalFilename(file.name),
        filepath: filename,
        filesize: file.size,
        mimetype: file.type,
        createdById: actor.id,
      },
    })
  } catch (error) {
    if (writtenFilePath) {
      try {
        await unlink(writtenFilePath)
      } catch {
        // best effort cleanup
      }
    }
    throw error
  }

  revalidatePath("/admin/performance")
  revalidatePath("/my-kpis")
}
