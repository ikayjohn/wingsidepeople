import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { z } from "zod"
import { assignOnboardingChecklists } from "@/lib/onboarding"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"
import { getEmployeeIdExample, getEmployeeIdRegex, getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { isValidOrgSelection } from "@/lib/org-structure-data"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import { normalizeUserImage } from "@/lib/avatar"
import { resolveManagerAssignment } from "@/lib/workflow-routing"

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      name: true,
      preferredName: true,
      employeeId: true,
      email: true,
      image: true,
      gender: true,
      phone: true,
      address: true,
      department: true,
      position: true,
      employmentType: true,
      workLocation: true,
      employmentStartDate: true,
      status: true,
      showBirthdayPublicly: true,
      emergencyContact: true,
      emergencyPhone: true,
      birthday: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user ? { ...user, image: normalizeUserImage(user.image, user.id) } : null)
}

export async function PUT(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const [securityRules, employmentDefaults] = await Promise.all([
      getSecurityAccessRules(),
      getEmploymentDefaults(),
    ])
    const profileSchema = z.object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(100).optional(),
      preferredName: z.string().max(100).optional().nullable(),
      employeeId: z.string().regex(
        getEmployeeIdRegex(securityRules.employeeIdPrefix, securityRules.employeeIdDigits),
        `Employee ID must use the format ${getEmployeeIdExample(securityRules.employeeIdPrefix, securityRules.employeeIdDigits)}`
      ).optional().nullable(),
      gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say"]).optional().nullable(),
      phone: z.string().max(20).optional().nullable(),
      address: z.string().max(300).optional().nullable(),
      department: z.string().max(100).optional().nullable(),
      position: z.string().max(100).optional().nullable(),
      employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).optional().nullable(),
      workLocation: z.string().max(100).optional().nullable(),
      employmentStartDate: z.string().optional().nullable(),
      showBirthdayPublicly: z.boolean().optional(),
      emergencyContact: z.string().max(100).optional().nullable(),
      emergencyPhone: z.string().max(20).optional().nullable(),
      birthday: z.string().optional().nullable(),
    })
    const data = profileSchema.parse(body)
    const hasExplicitSplitName = data.firstName !== undefined || data.lastName !== undefined
    const combinedName = hasExplicitSplitName
      ? `${data.firstName?.trim() || ""} ${data.lastName?.trim() || ""}`.trim()
      : undefined

    if (hasExplicitSplitName && !combinedName) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 })
    }

    if ((data.department && !data.position) || (!data.department && data.position)) {
      return NextResponse.json(
        { error: "Department and role must be updated together." },
        { status: 400 }
      )
    }

    if (data.department && data.position && !(await isValidOrgSelection(data.department, data.position))) {
      return NextResponse.json(
        { error: "Select a valid department and role from the organization chart." },
        { status: 400 }
      )
    }

    if (data.workLocation && hasPrismaDelegates("workLocation")) {
      const validWorkLocation = await prisma.workLocation.findFirst({
        where: { name: data.workLocation, isActive: true },
        select: { id: true },
      })
      if (!validWorkLocation) {
        return NextResponse.json(
          { error: "Select a valid work location." },
          { status: 400 }
        )
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { department: true, position: true },
    })

    const updateData: Record<string, unknown> = {}
    if (combinedName !== undefined) {
      updateData.name = combinedName
    } else if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.preferredName !== undefined) updateData.preferredName = data.preferredName
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.department !== undefined) updateData.department = data.department
    if (data.position !== undefined) updateData.position = data.position
    if ((data.department !== undefined || data.position !== undefined) && (data.department || currentUser?.department) && (data.position || currentUser?.position)) {
      updateData.managerId = await resolveManagerAssignment({
        userId: session!.user.id,
        department: data.department ?? currentUser?.department,
        position: data.position ?? currentUser?.position,
      })
    }
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType || employmentDefaults.defaultEmploymentType
    if (data.workLocation !== undefined) updateData.workLocation = data.workLocation
    if (data.employmentStartDate !== undefined) {
      updateData.employmentStartDate = data.employmentStartDate ? new Date(data.employmentStartDate) : null
    }
    if (data.showBirthdayPublicly !== undefined) updateData.showBirthdayPublicly = data.showBirthdayPublicly
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact
    if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone
    if (data.birthday !== undefined) {
      updateData.birthday = data.birthday ? new Date(data.birthday) : null
    }

    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        preferredName: true,
        employeeId: true,
        email: true,
        image: true,
        gender: true,
        phone: true,
        address: true,
        department: true,
        position: true,
        employmentType: true,
        workLocation: true,
        employmentStartDate: true,
        status: true,
        showBirthdayPublicly: true,
        emergencyContact: true,
        emergencyPhone: true,
        birthday: true,
      },
    })

    const departmentChanged = data.department !== undefined && data.department !== currentUser?.department
    const positionChanged = data.position !== undefined && data.position !== currentUser?.position

    if (departmentChanged || positionChanged) {
      await assignOnboardingChecklists({
        userId: session!.user.id,
        department: user.department,
        position: user.position,
      })
    }

    return NextResponse.json({ ...user, image: normalizeUserImage(user.image, user.id) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Employee ID is already in use" }, { status: 409 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
