"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessAdminSection } from "@/lib/rbac"

const assetSchema = z.object({
  assetCode: z.string().max(60).optional(),
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  serialNumber: z.string().max(120).optional(),
  condition: z.enum(["good", "fair", "damaged", "retired"]),
  location: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
})

async function requireAssetsAccess() {
  const session = await auth()
  if (!session || !canAccessAdminSection(session.user.role, "assets")) {
    throw new Error("Unauthorized")
  }
  return session
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const parsed = String(value || "").trim()
  if (!parsed) return null
  return new Date(`${parsed}T00:00:00.000Z`)
}

export async function createAsset(formData: FormData) {
  await requireAssetsAccess()
  const parsed = assetSchema.parse({
    assetCode: formData.get("assetCode") || undefined,
    name: formData.get("name"),
    category: formData.get("category"),
    serialNumber: formData.get("serialNumber") || undefined,
    condition: formData.get("condition"),
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
  })

  await prisma.asset.create({
    data: {
      assetCode: parsed.assetCode || null,
      name: parsed.name,
      category: parsed.category,
      serialNumber: parsed.serialNumber || null,
      condition: parsed.condition,
      location: parsed.location || null,
      notes: parsed.notes || null,
    },
  })

  revalidatePath("/admin/assets")
}

export async function assignAsset(formData: FormData) {
  const session = await requireAssetsAccess()
  const assetId = z.string().min(1).parse(formData.get("assetId"))
  const assignedToId = z.string().min(1).parse(formData.get("assignedToId"))
  const notes = z.string().max(500).optional().parse(formData.get("notes") || undefined)
  const expectedReturnDate = parseOptionalDate(formData.get("expectedReturnDate"))

  await prisma.$transaction(async (tx) => {
    const [asset, employee] = await Promise.all([
      tx.asset.findUnique({
        where: { id: assetId },
        select: { id: true, status: true },
      }),
      tx.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, department: true },
      }),
    ])

    if (!asset || !["available", "returned"].includes(asset.status)) {
      throw new Error("Asset is not available for assignment")
    }
    if (!employee) {
      throw new Error("Employee not found")
    }

    const existingAssignment = await tx.assetAssignment.findFirst({
      where: { assetId, status: "active" },
      select: { id: true },
    })
    if (existingAssignment) {
      throw new Error("Asset already has an active assignment")
    }

    await tx.assetAssignment.create({
      data: {
        assetId,
        assignedToId,
        assignedById: session.user.id,
        departmentSnapshot: employee.department || null,
        expectedReturnDate,
        notes: notes || null,
      },
    })
    await tx.asset.update({
      where: { id: assetId },
      data: { status: "assigned" },
    })
  })

  revalidatePath("/admin/assets")
  revalidatePath("/my-assets")
}

export async function returnAsset(formData: FormData) {
  await requireAssetsAccess()
  const assignmentId = z.string().min(1).parse(formData.get("assignmentId"))
  const assetId = z.string().min(1).parse(formData.get("assetId"))
  const returnCondition = z.enum(["good", "fair", "damaged"]).parse(formData.get("returnCondition"))
  const nextStatus = z.enum(["available", "returned", "maintenance", "damaged"]).parse(formData.get("nextStatus"))

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.assetAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, status: true, assetId: true },
    })
    if (!assignment || assignment.status !== "active" || assignment.assetId !== assetId) {
      throw new Error("Active asset assignment not found")
    }

    await tx.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "returned",
        returnedAt: new Date(),
        returnCondition,
      },
    })
    await tx.asset.update({
      where: { id: assetId },
      data: {
        status: nextStatus,
        condition: nextStatus === "damaged" ? "damaged" : returnCondition,
      },
    })
  })

  revalidatePath("/admin/assets")
  revalidatePath("/my-assets")
}

export async function updateAssetStatus(formData: FormData) {
  await requireAssetsAccess()
  const assetId = z.string().min(1).parse(formData.get("assetId"))
  const status = z.enum(["available", "assigned", "returned", "lost", "damaged", "maintenance", "retired"]).parse(formData.get("status"))
  const condition = z.enum(["good", "fair", "damaged", "retired"]).parse(formData.get("condition"))

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      status,
      condition,
    },
  })

  revalidatePath("/admin/assets")
  revalidatePath("/my-assets")
}
