import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { normalizeUserImage } from "@/lib/avatar"

export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  const department = searchParams.get("department")?.trim()
  const role = searchParams.get("role")?.trim()
  const location = searchParams.get("location")?.trim()

  const employees = await prisma.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { preferredName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { position: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(department ? { department: { equals: department, mode: "insensitive" } } : {}),
      ...(role ? { position: { equals: role, mode: "insensitive" } } : {}),
      ...(location ? { workLocation: { contains: location, mode: "insensitive" } } : {}),
      status: { not: "exited" },
    },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      image: true,
      role: true,
      department: true,
      position: true,
      workLocation: true,
      status: true,
    },
    orderBy: [{ name: "asc" }],
    take: 200,
  })

  const [departments, roles, locations] = await Promise.all([
    prisma.user.findMany({
      where: { department: { not: null } },
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" },
    }),
    prisma.user.findMany({
      where: { position: { not: null } },
      distinct: ["position"],
      select: { position: true },
      orderBy: { position: "asc" },
    }),
    prisma.user.findMany({
      where: { workLocation: { not: null } },
      distinct: ["workLocation"],
      select: { workLocation: true },
      orderBy: { workLocation: "asc" },
    }),
  ])

  return NextResponse.json({
    currentUserId: session!.user.id,
    employees: employees.map((employee) => ({
      ...employee,
      image: normalizeUserImage(employee.image, employee.id),
    })),
    filters: {
      departments: departments.map((d: { department: string | null }) => d.department).filter(Boolean),
      roles: roles.map((r: { position: string | null }) => r.position).filter(Boolean),
      locations: locations.map((l: { workLocation: string | null }) => l.workLocation).filter(Boolean),
    },
  })
}
