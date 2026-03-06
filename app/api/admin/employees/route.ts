import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { assignOnboardingChecklists } from "@/lib/onboarding"

const updateEmployeeSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "pending_approval", "rejected", "suspended", "exited"]),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const employees = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      role: true,
      department: true,
      position: true,
      workLocation: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(employees)
}

export async function PATCH(req: Request) {
  const { error, session } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = updateEmployeeSchema.parse(body)
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
