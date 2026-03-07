import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

type ConversationMessage = {
  id: string
  body: string
  createdAt: Date
  senderId: string
  sender: {
    id: string
    name: string | null
    preferredName: string | null
    email: string
  }
}

type ConversationMember = {
  userId: string
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: id,
        userId: session!.user.id,
      },
    },
    select: { id: true },
  })
  if (!membership) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      members: {
        select: {
          userId: true,
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
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  await prisma.conversationMember.update({
    where: {
      conversationId_userId: {
        conversationId: id,
        userId: session!.user.id,
      },
    },
    data: { lastReadAt: new Date() },
  })

  const otherUser = (conversation.members as ConversationMember[]).find((member: ConversationMember) => member.userId !== session!.user.id)?.user ?? null

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      otherUser,
    },
    messages: conversation.messages as ConversationMessage[],
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  try {
    const body = await req.json()
    const data = sendMessageSchema.parse(body)

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: session!.user.id,
        },
      },
      select: { id: true },
    })
    if (!membership) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const now = new Date()
    const [, , message] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: now },
      }),
      prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId: session!.user.id,
          },
        },
        data: { lastReadAt: now },
      }),
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: session!.user.id,
          body: data.body,
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({ message })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
