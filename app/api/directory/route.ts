import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const { error } = await requireAuth()
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
      ...(role ? { role } : {}),
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
      distinct: ["role"],
      select: { role: true },
      orderBy: { role: "asc" },
    }),
    prisma.user.findMany({
      where: { workLocation: { not: null } },
      distinct: ["workLocation"],
      select: { workLocation: true },
      orderBy: { workLocation: "asc" },
    }),
  ])

  return NextResponse.json({
    employees,
    filters: {
      departments: departments.map((d: { department: string | null }) => d.department).filter(Boolean),
      roles: roles.map((r: { role: string | null }) => r.role).filter(Boolean),
      locations: locations.map((l: { workLocation: string | null }) => l.workLocation).filter(Boolean),
    },
  })
}
