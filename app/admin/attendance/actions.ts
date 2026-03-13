"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection, normalizeRole } from "@/lib/rbac"
import { calculateOvertimeMinutes, calculateWorkedMinutes } from "@/lib/attendance"

async function requireAttendanceAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "attendance")) {
    throw new Error("Unauthorized")
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, department: true },
  })
  if (!actor) throw new Error("Unauthorized")
  return actor
}

function parseDateTime(value: FormDataEntryValue | null, field: string) {
  const raw = z.string().min(1, `${field} is required`).parse(value)
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid`)
  }
  return date
}

export async function createAttendanceRecord(formData: FormData) {
  const actor = await requireAttendanceAccess()
  const userId = z.string().min(1).parse(formData.get("userId"))
  const checkInAt = parseDateTime(formData.get("checkInAt"), "Check-in time")
  const checkOutRaw = formData.get("checkOutAt")
  const checkOutAt = checkOutRaw ? parseDateTime(checkOutRaw, "Check-out time") : null
  const status = z.enum(["present", "incomplete", "absent", "excused"]).parse(formData.get("status") || "present")
  const notes = z.string().max(2000).optional().parse(formData.get("notes") || undefined)

  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, department: true, managerId: true },
  })
  if (!employee) throw new Error("Employee not found")

  if (normalizeRole(actor.role) === "manager") {
    const managesEmployee = employee.managerId === actor.id || employee.department === actor.department
    if (!managesEmployee) throw new Error("Managers can only manage attendance for their team")
  }

  const workedMinutes = calculateWorkedMinutes(checkInAt, checkOutAt)
  const overtimeMinutes = calculateOvertimeMinutes(workedMinutes)

  await prisma.attendanceRecord.create({
    data: {
      userId,
      departmentSnapshot: employee.department || null,
      checkInAt,
      checkOutAt,
      workedMinutes,
      overtimeMinutes,
      status,
      notes: notes || null,
    },
  })

  revalidatePath("/admin/attendance")
  revalidatePath("/attendance")
}

export async function completeAttendanceRecord(formData: FormData) {
  const actor = await requireAttendanceAccess()
  const recordId = z.string().min(1).parse(formData.get("recordId"))
  const checkOutAt = parseDateTime(formData.get("checkOutAt"), "Check-out time")

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: {
      user: { select: { id: true, department: true, managerId: true } },
    },
  })
  if (!record) throw new Error("Attendance record not found")

  if (normalizeRole(actor.role) === "manager") {
    const managesEmployee = record.user.managerId === actor.id || record.user.department === actor.department
    if (!managesEmployee) throw new Error("Managers can only manage attendance for their team")
  }

  const workedMinutes = calculateWorkedMinutes(record.checkInAt, checkOutAt)
  const overtimeMinutes = calculateOvertimeMinutes(workedMinutes)

  await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      checkOutAt,
      workedMinutes,
      overtimeMinutes,
      status: "present",
    },
  })

  revalidatePath("/admin/attendance")
  revalidatePath("/attendance")
}
