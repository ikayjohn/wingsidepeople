import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { broadcastInboxMessage } from "@/lib/messages"

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

type MembershipRow = {
  userId: string
}

type ConversationUserRow = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  image: string | null
  department: string | null
  position: string | null
}

type MessageRow = {
  id: string
  body: string
  createdAt: Date
  senderId: string
  senderUserId: string
  senderName: string | null
  senderPreferredName: string | null
  senderEmail: string
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { id } = await params

  const membership = await prisma.$queryRaw<MembershipRow[]>`
    SELECT "userId"
    FROM "ConversationMember"
    WHERE "conversationId" = ${id}
      AND "userId" = ${session!.user.id}
    LIMIT 1
  `

  if (membership.length === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const [otherUser] = await prisma.$queryRaw<ConversationUserRow[]>`
    SELECT
      u.id,
      u.name,
      u."preferredName" AS "preferredName",
      u.email,
      u.image,
      u.department,
      u.position
    FROM "ConversationMember" cm
    JOIN "User" u
      ON u.id = cm."userId"
    WHERE cm."conversationId" = ${id}
      AND cm."userId" <> ${session!.user.id}
    LIMIT 1
  `

  const messageRows = await prisma.$queryRaw<MessageRow[]>`
    SELECT
      m.id,
      m.body,
      m."createdAt" AS "createdAt",
      m."senderId" AS "senderId",
      sender.id AS "senderUserId",
      sender.name AS "senderName",
      sender."preferredName" AS "senderPreferredName",
      sender.email AS "senderEmail"
    FROM "Message" m
    JOIN "User" sender
      ON sender.id = m."senderId"
    WHERE m."conversationId" = ${id}
    ORDER BY m."createdAt" ASC
    LIMIT 100
  `

  await prisma.$executeRaw`
    UPDATE "ConversationMember"
    SET "lastReadAt" = ${new Date()}
    WHERE "conversationId" = ${id}
      AND "userId" = ${session!.user.id}
  `

  return NextResponse.json({
    conversation: {
      id,
      otherUser: otherUser ?? null,
    },
    messages: messageRows.map((message: MessageRow) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: {
        id: message.senderUserId,
        name: message.senderName,
        preferredName: message.senderPreferredName,
        email: message.senderEmail,
      },
    })),
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
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.$queryRaw<MembershipRow[]>`
        SELECT "userId"
        FROM "ConversationMember"
        WHERE "conversationId" = ${id}
          AND "userId" = ${session!.user.id}
        LIMIT 1
      `

      if (membership.length === 0) {
        return null
      }

      const members = await tx.$queryRaw<MembershipRow[]>`
        SELECT "userId"
        FROM "ConversationMember"
        WHERE "conversationId" = ${id}
      `

      await tx.$executeRaw`
        UPDATE "Conversation"
        SET "updatedAt" = ${now}
        WHERE id = ${id}
      `

      await tx.$executeRaw`
        UPDATE "ConversationMember"
        SET "lastReadAt" = ${now}
        WHERE "conversationId" = ${id}
          AND "userId" = ${session!.user.id}
      `

      const messageId = randomUUID()

      await tx.$executeRaw`
        INSERT INTO "Message" ("id", "conversationId", "senderId", "body", "createdAt", "updatedAt")
        VALUES (${messageId}, ${id}, ${session!.user.id}, ${data.body}, ${now}, ${now})
      `

      const [message] = await tx.$queryRaw<MessageRow[]>`
        SELECT
          m.id,
          m.body,
          m."createdAt" AS "createdAt",
          m."senderId" AS "senderId",
          sender.id AS "senderUserId",
          sender.name AS "senderName",
          sender."preferredName" AS "senderPreferredName",
          sender.email AS "senderEmail"
        FROM "Message" m
        JOIN "User" sender
          ON sender.id = m."senderId"
        WHERE m.id = ${messageId}
        LIMIT 1
      `

      if (!message) {
        throw new Error("Failed to load saved message.")
      }

      return {
        memberIds: members.map((member: MembershipRow) => member.userId),
        message: {
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          senderId: message.senderId,
          sender: {
            id: message.senderUserId,
            name: message.senderName,
            preferredName: message.senderPreferredName,
            email: message.senderEmail,
          },
        },
      }
    })

    if (!result) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    void broadcastInboxMessage(result.memberIds, {
      conversationId: id,
      message: result.message,
    }).catch(() => {
      // Message delivery should not fail if the realtime broadcast does.
    })

    return NextResponse.json({ message: result.message })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send message" },
      { status: 500 }
    )
  }
}
