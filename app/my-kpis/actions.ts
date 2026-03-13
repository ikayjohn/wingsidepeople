"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function updateMyKpiProgress(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const kpiId = z.string().min(1).parse(formData.get("kpiId"))
  const currentValue = z.coerce.number().parse(formData.get("currentValue"))
  const selfRating = formData.get("selfRating") ? Number(formData.get("selfRating")) : null

  const kpi = await prisma.employeeKpi.findUnique({
    where: { id: kpiId },
    select: { id: true, userId: true },
  })
  if (!kpi || kpi.userId !== session.user.id) {
    throw new Error("Forbidden")
  }

  await prisma.employeeKpi.update({
    where: { id: kpiId },
    data: {
      currentValue,
      selfRating,
    },
  })

  revalidatePath("/my-kpis")
  revalidatePath("/admin/performance")
}
