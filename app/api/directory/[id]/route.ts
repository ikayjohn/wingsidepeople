import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { canEditOtherProfiles, hasAnyRole } from "@/lib/rbac"
import { normalizeUserImage } from "@/lib/avatar"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      image: true,
      role: true,
      phone: true,
      address: true,
      birthday: true,
      showBirthdayPublicly: true,
      department: true,
      position: true,
      manager: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
        },
      },
      employmentType: true,
      workLocation: true,
      status: true,
      emergencyContact: true,
      emergencyPhone: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const isSelf = user.id === session!.user.id
  const canViewRestricted = canEditOtherProfiles(session!.user.role)
  const isManager = hasAnyRole(session!.user.role, ["manager"]) && user.manager?.id === session!.user.id
  const canViewBirthday = user.showBirthdayPublicly || isSelf || canViewRestricted

  return NextResponse.json({
    id: user.id,
    name: user.name,
    preferredName: user.preferredName,
    email: user.email,
    image: normalizeUserImage(user.image, user.id),
    role: user.role,
    phone: user.phone,
    address: canViewRestricted || isSelf ? user.address : null,
    birthday: canViewBirthday ? user.birthday : null,
    department: user.department,
    position: user.position,
    manager: user.manager,
    employmentType: user.employmentType,
    workLocation: user.workLocation,
    status: user.status,
    emergencyContact: canViewRestricted || isSelf || isManager ? user.emergencyContact : null,
    emergencyPhone: canViewRestricted || isSelf || isManager ? user.emergencyPhone : null,
    createdAt: user.createdAt,
  })
}
