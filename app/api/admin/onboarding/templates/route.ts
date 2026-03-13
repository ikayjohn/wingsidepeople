import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { z } from "zod"
import { onboardingItemInputSchema } from "@/lib/onboarding-workflow"

const templateSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
  items: z.array(onboardingItemInputSchema).min(1),
})

export async function GET(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  const templates = await prisma.onboardingTemplate.findMany({
    include: {
      _count: { select: { items: true, checklists: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const body = await req.json()
    const data = templateSchema.parse(body)

    const template = await prisma.onboardingTemplate.create({
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

    return NextResponse.json(template, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
