import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { assignOnboardingChecklists } from "@/lib/onboarding"
import { getEmployeeIdExample, getEmployeeIdRegex, getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { getOrgRoles, isValidOrgSelection } from "@/lib/org-structure-data"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { resolveManagerAssignment } from "@/lib/workflow-routing"

const updateStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "pending_approval", "rejected", "suspended", "exited"]),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const [employees, managers, workLocations, securityRules, employmentDefaults, orgRoles] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        preferredName: true,
        employeeId: true,
        email: true,
        role: true,
        gender: true,
        phone: true,
        address: true,
        department: true,
        position: true,
        managerId: true,
        employmentType: true,
        workLocation: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where: { status: { not: "exited" } },
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        department: true,
        position: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    hasPrismaDelegates("workLocation")
      ? prisma.workLocation.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : Promise.resolve([] as Array<{ name: string }>),
    getSecurityAccessRules(),
    getEmploymentDefaults(),
    getOrgRoles(),
  ])

  return NextResponse.json({
    employees,
    managers,
    workLocations: workLocations.map((item) => item.name),
    employeeIdPrefix: securityRules.employeeIdPrefix,
    employeeIdDigits: securityRules.employeeIdDigits,
    defaultEmploymentType: employmentDefaults.defaultEmploymentType,
    orgRoles,
  })
}

export async function PATCH(req: Request) {
  const { error, session } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = updateStatusSchema.parse(body)
    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, role: true },
    })
    if (!target) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const isProtectedRole = target.role === "admin" || target.role === "super_admin"
    if (isProtectedRole) {
      return NextResponse.json({ error: "Status changes for admin accounts are blocked." }, { status: 403 })
    }

    if (data.userId === session!.user.id && data.status !== "active") {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: data.userId },
      data: { status: data.status },
      select: {
        id: true,
        status: true,
        department: true,
        position: true,
      },
    })

    if (data.status === "active") {
      await assignOnboardingChecklists({
        userId: user.id,
        department: user.department,
        position: user.position,
      })
    }

    return NextResponse.json({ ok: true, user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update employee status" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const { error, session } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const [securityRules, employmentDefaults] = await Promise.all([
      getSecurityAccessRules(),
      getEmploymentDefaults(),
    ])

    const updateEmployeeSchema = z.object({
      userId: z.string().min(1),
      name: z.string().min(1).max(100),
      preferredName: z.string().max(100).optional().nullable(),
      employeeId: z.string().regex(
        getEmployeeIdRegex(securityRules.employeeIdPrefix, securityRules.employeeIdDigits),
        `Employee ID must use the format ${getEmployeeIdExample(securityRules.employeeIdPrefix, securityRules.employeeIdDigits)}`
      ).nullable(),
      gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say"]).optional().nullable(),
      phone: z.string().max(20).optional().nullable(),
      address: z.string().max(300).optional().nullable(),
      department: z.string().max(100).nullable(),
      position: z.string().max(100).nullable(),
      managerId: z.string().min(1).nullable(),
      employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).optional().nullable(),
      workLocation: z.string().max(100).nullable(),
      status: z.enum(["active", "pending_approval", "rejected", "suspended", "exited"]),
    })

    const data = updateEmployeeSchema.parse(body)
    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, role: true, department: true, position: true, managerId: true },
    })

    if (!target) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const isProtectedRole = target.role === "admin" || target.role === "super_admin"
    if (isProtectedRole) {
      return NextResponse.json({ error: "Editing admin accounts is blocked here." }, { status: 403 })
    }

    if (data.userId === session!.user.id && data.status !== "active") {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 })
    }

    if ((data.department && !data.position) || (!data.department && data.position)) {
      return NextResponse.json({ error: "Department and role must be set together." }, { status: 400 })
    }

    if (data.department && data.position && !(await isValidOrgSelection(data.department, data.position))) {
      return NextResponse.json({ error: "Select a valid department and role." }, { status: 400 })
    }

    if (data.workLocation && hasPrismaDelegates("workLocation")) {
      const validWorkLocation = await prisma.workLocation.findFirst({
        where: { name: data.workLocation, isActive: true },
        select: { id: true },
      })
      if (!validWorkLocation) {
        return NextResponse.json({ error: "Select a valid work location." }, { status: 400 })
      }
    }

    if (data.managerId === data.userId) {
      return NextResponse.json({ error: "An employee cannot be their own manager." }, { status: 400 })
    }

    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { id: true, status: true },
      })
      if (!manager || manager.status === "exited") {
        return NextResponse.json({ error: "Select a valid line manager." }, { status: 400 })
      }
    }

    const resolvedManagerId = await resolveManagerAssignment({
      userId: data.userId,
      department: data.department,
      position: data.position,
      managerId: data.managerId,
    })

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: {
        name: data.name,
        preferredName: data.preferredName || null,
        employeeId: data.employeeId || null,
        gender: data.gender || null,
        phone: data.phone || null,
        address: data.address || null,
        department: data.department || null,
        position: data.position || null,
        managerId: resolvedManagerId,
        employmentType: data.employmentType || employmentDefaults.defaultEmploymentType,
        workLocation: data.workLocation || null,
        status: data.status,
      },
      select: {
        id: true,
        department: true,
        position: true,
        managerId: true,
      },
    })

    const departmentChanged = updated.department !== target.department
    const positionChanged = updated.position !== target.position
    const managerChanged = updated.managerId !== target.managerId
    if (data.status === "active" || departmentChanged || positionChanged || managerChanged) {
      await assignOnboardingChecklists({
        userId: updated.id,
        department: updated.department,
        position: updated.position,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}
