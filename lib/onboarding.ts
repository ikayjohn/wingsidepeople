import { prisma } from "@/lib/prisma"

export async function assignOnboardingChecklists(params: {
  userId: string
  department?: string | null
  position?: string | null
}) {
  const department = params.department?.trim() || null
  const position = params.position?.trim() || null

  const templates = await prisma.onboardingTemplate.findMany({
    where: {
      OR: [
        { isDefault: true },
        ...(department ? [{ department }] : []),
        ...(position ? [{ position }] : []),
        ...(department && position ? [{ department, position }] : []),
      ],
    },
    select: { id: true },
  })

  if (!templates.length) return

  for (const template of templates) {
    const checklist = await prisma.employeeChecklist.upsert({
      where: {
        userId_templateId: {
          userId: params.userId,
          templateId: template.id,
        },
      },
      update: {},
      create: {
        userId: params.userId,
        templateId: template.id,
      },
      select: {
        id: true,
        templateId: true,
      },
    })

    const items = await prisma.onboardingItem.findMany({
      where: { templateId: checklist.templateId },
      select: { id: true },
    })

    for (const item of items) {
      await prisma.checklistProgress.upsert({
        where: {
          checklistId_itemId: {
            checklistId: checklist.id,
            itemId: item.id,
          },
        },
        update: {},
        create: {
          checklistId: checklist.id,
          itemId: item.id,
        },
      })
    }
  }
}

