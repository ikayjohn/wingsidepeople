"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

async function requireWorkLocationAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "work_locations")) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function createWorkLocation(formData: FormData) {
  await requireWorkLocationAccess()
  const name = z.string().min(2).max(100).parse(formData.get("name"))
  const code = z.string().max(20).optional().parse(formData.get("code") || undefined)
  const sortOrder = z.coerce.number().int().min(0).max(999).parse(formData.get("sortOrder") || "0")

  await prisma.workLocation.create({
    data: {
      name: name.trim(),
      code: code?.trim() || null,
      sortOrder,
      isActive: true,
    },
  })

  revalidatePath("/admin/work-locations")
  revalidatePath("/register")
}

export async function updateWorkLocationState(formData: FormData) {
  await requireWorkLocationAccess()
  const id = z.string().min(1).parse(formData.get("id"))
  const isActive = z.enum(["true", "false"]).transform((value) => value === "true").parse(String(formData.get("isActive")))

  await prisma.workLocation.update({
    where: { id },
    data: { isActive },
  })

  revalidatePath("/admin/work-locations")
  revalidatePath("/register")
}
