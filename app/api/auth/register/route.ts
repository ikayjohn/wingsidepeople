import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, getClientIp, getRateLimitRetryAfter } from "@/lib/security"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

const registerSchema = z.object({
  email: z.string().email().refine((email) => email.endsWith("@wingside.ng"), {
    message: "Email must be from wingside.ng domain",
  }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  employeeId: z.string().min(2, "Employee ID is required").max(50),
  phone: z.string().min(7, "Phone is required").max(20),
  department: z.string().min(2, "Department is required").max(100),
  position: z.string().min(2, "Position is required").max(100),
  employmentType: z.string().min(2, "Employment type is required").max(50),
  workLocation: z.string().min(2, "Work location is required").max(100),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown"
    const rate = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000)
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
    const { email, password, name, employeeId, phone, department, position, employmentType, workLocation } = registerSchema.parse(body)

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

    const supabaseAdmin = getSupabaseAdminClient()
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, employeeId, phone, department, position, employmentType, workLocation },
    })

    if (authError) {
      return NextResponse.json(
        { error: "Unable to create account. Please try again or contact support." },
        { status: 400 }
      )
    }

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        employeeId,
        phone,
        department,
        position,
        employmentType,
        workLocation,
        status: "pending_approval",
      },
    })

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
