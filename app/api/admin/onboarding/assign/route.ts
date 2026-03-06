import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const assignSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1),
})

export async function POST(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = assignSchema.parse(body)

    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: data.templateId },
      include: { items: { orderBy: { order: "asc" } } },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const checklist = await prisma.employeeChecklist.create({
      data: {
        userId: data.userId,
        templateId: data.templateId,
        progress: {
          create: template.items.map((item) => ({
            itemId: item.id,
            completed: false,
          })),
        },
      },
      include: { progress: true },
    })

    await createNotification({
      userId: data.userId,
      type: "onboarding",
      title: "New onboarding checklist assigned",
      message: `You have been assigned the "${template.title}" checklist.`,
      link: "/onboarding",
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : "Something went wrong"
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "This checklist is already assigned to this employee" }, { status: 409 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
