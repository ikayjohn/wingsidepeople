import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimitPersistent, getClientIp, getRateLimitRetryAfter } from "@/lib/security"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"
import { isValidOrgSelection } from "@/lib/org-structure-data"
import { getEmployeeIdExample, getEmployeeIdRegex, getEmploymentDefaults, getSecurityAccessRules } from "@/lib/admin-settings"
import { resolveManagerAssignment } from "@/lib/workflow-routing"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = await checkRateLimitPersistent({
      scope: "register",
      key: `register:${ip}`,
      max: 10,
      windowMs: 15 * 60 * 1000,
      ip,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(getRateLimitRetryAfter(rate.resetAt)) },
        }
      )
    }

    const body = await req.json()
    const [securityRules, employmentDefaults] = await Promise.all([
      getSecurityAccessRules(),
      getEmploymentDefaults(),
    ])

    if (!securityRules.allowSelfServiceRegistration) {
      return NextResponse.json(
        { error: "Self-service registration is currently disabled." },
        { status: 403 }
      )
    }

    const registerSchema = z.object({
      email: z.string().email().refine((email) => email.toLowerCase().endsWith(`@${securityRules.allowedEmailDomain.toLowerCase()}`), {
        message: `Email must be from ${securityRules.allowedEmailDomain}`,
      }),
      password: z.string().min(securityRules.passwordMinLength, `Password must be at least ${securityRules.passwordMinLength} characters`),
      firstName: z.string().min(1, "First name is required").max(50),
      lastName: z.string().min(1, "Last name is required").max(50),
      employeeId: z.string().regex(
        getEmployeeIdRegex(securityRules.employeeIdPrefix, securityRules.employeeIdDigits),
        `Employee ID must use the format ${getEmployeeIdExample(securityRules.employeeIdPrefix, securityRules.employeeIdDigits)}`
      ),
      gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say"]),
      phone: z.string().min(7, "Phone is required").max(20),
      address: z.string().max(300).optional().nullable(),
      birthday: z.string().min(1, "Birthday is required"),
      department: z.string().min(2, "Department is required").max(100),
      position: z.string().min(2, "Position is required").max(100),
      employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default(employmentDefaults.defaultEmploymentType as "full_time" | "part_time" | "contract" | "intern"),
      workLocation: z.string().min(2, "Work location is required").max(100),
    })

    const { email, password, firstName, lastName, employeeId, gender, phone, address, birthday, department, position, employmentType, workLocation } = registerSchema.parse(body)
    const name = `${firstName.trim()} ${lastName.trim()}`
    const managerId = await resolveManagerAssignment({ department, position })

    if (!(await isValidOrgSelection(department, position))) {
      return NextResponse.json(
        { error: "Select a valid department and role from the organization chart." },
        { status: 400 }
      )
    }

    const validWorkLocation = await prisma.workLocation.findFirst({
      where: { name: workLocation, isActive: true },
      select: { id: true },
    })
    if (!validWorkLocation) {
      return NextResponse.json(
        { error: "Select a valid work location." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Unable to create account. Please try again or contact support." },
        { status: 400 }
      )
    }

    const existingEmployeeId = await prisma.user.findUnique({
      where: { employeeId },
      select: { id: true },
    })
    if (existingEmployeeId) {
      return NextResponse.json(
        { error: "Employee ID is already in use." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    try {
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          name,
          employeeId,
          gender,
          phone,
          address: address || null,
          birthday: birthday ? new Date(birthday) : null,
          department,
          position,
          managerId,
          workLocation,
          employmentType,
          annualLeaveAllowance: employmentDefaults.defaultAnnualLeaveAllowance,
          status: "pending_approval",
        },
      })
    } catch (dbError) {
      if (dbError instanceof PrismaClientKnownRequestError && dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Unable to create account. Please try again or contact support." },
          { status: 400 }
        )
      }
      throw dbError
    }

    return NextResponse.json(
      { message: "Account created successfully. Awaiting admin approval." },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
