import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { buildDirectConversationKey } from "@/lib/messages"

const createConversationSchema = z.object({
  targetUserId: z.string().min(1),
})

type ConversationListMember = {
  id: string
  userId: string
  lastReadAt: Date | null
  user: {
    id: string
    name: string | null
    preferredName: string | null
    email: string
    image: string | null
    department: string | null
    position: string | null
  }
}

type ConversationListMessage = {
  id: string
  body: string
  createdAt: Date
  senderId: string
}

type ConversationListItem = {
  id: string
  updatedAt: Date
  members: ConversationListMember[]
  messages: ConversationListMessage[]
}

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: { userId: session!.user.id },
      },
    },
    select: {
      id: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          userId: true,
          lastReadAt: true,
          user: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
              image: true,
              department: true,
              position: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  })

  const items = conversations
    .map((conversation) => {
      const typedConversation = conversation as ConversationListItem
      const selfMember = typedConversation.members.find((member) => member.userId === session!.user.id)
      const otherMember = typedConversation.members.find((member) => member.userId !== session!.user.id)
      const latestMessage = typedConversation.messages[0] ?? null

      if (!selfMember || !otherMember) {
        return null
      }

      const hasUnread = !!latestMessage &&
        latestMessage.senderId !== session!.user.id &&
        (!selfMember.lastReadAt || latestMessage.createdAt > selfMember.lastReadAt)

      return {
        id: typedConversation.id,
        updatedAt: typedConversation.updatedAt,
        otherUser: otherMember.user,
        latestMessage,
        hasUnread,
      }
    })
    .filter((item): item is NonNullable<typeof item> => !!item)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  return NextResponse.json({ conversations: items })
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const data = createConversationSchema.parse(body)

    if (data.targetUserId === session!.user.id) {
      return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: { id: true, status: true },
    })
    if (!target || target.status === "exited") {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    const directKey = buildDirectConversationKey(session!.user.id, data.targetUserId)

    const conversation = await prisma.conversation.upsert({
      where: { directKey },
      update: {},
      create: {
        type: "direct",
        directKey,
      },
      select: { id: true },
    })

    await prisma.$transaction([
      prisma.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: session!.user.id,
          },
        },
        update: {},
        create: {
          conversationId: conversation.id,
          userId: session!.user.id,
          lastReadAt: new Date(),
        },
      }),
      prisma.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: data.targetUserId,
          },
        },
        update: {},
        create: {
          conversationId: conversation.id,
          userId: data.targetUserId,
        },
      }),
    ])

    return NextResponse.json({ conversationId: conversation.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}
