import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { onboardingItemInputSchema } from "@/lib/onboarding-workflow"

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
  items: z.array(onboardingItemInputSchema).min(1),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  const template = await prisma.onboardingTemplate.findUnique({
    where: { id },
    include: {
      items: { orderBy: { order: "asc" } },
      checklists: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          progress: true,
        },
      },
    },
  })

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    await prisma.onboardingItem.deleteMany({ where: { templateId: id } })

    const template = await prisma.onboardingTemplate.update({
      where: { id },
      data: {
        title: data.title,
        department: data.department ?? null,
        position: data.position ?? null,
        isDefault: data.isDefault ?? false,
        items: {
          create: data.items.map((item, index) => ({
            type: item.type,
            title: item.title,
            description: item.description ?? null,
            resourceUrl: item.resourceUrl ?? null,
            content: item.content ?? null,
            config: item.config ?? undefined,
            order: index,
          })),
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    })

    return NextResponse.json(template)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const { id } = await params

  await prisma.onboardingTemplate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
