import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { buildDirectConversationKey } from "@/lib/messages"

const createConversationSchema = z.object({
  targetUserId: z.string().min(1),
})

type ConversationListRow = {
  id: string
  updatedAt: Date
  selfLastReadAt: Date | null
  otherUserId: string
  otherUserName: string | null
  otherUserPreferredName: string | null
  otherUserEmail: string
  otherUserImage: string | null
  otherUserDepartment: string | null
  otherUserPosition: string | null
  latestMessageId: string | null
  latestMessageBody: string | null
  latestMessageCreatedAt: Date | null
  latestMessageSenderId: string | null
}

type ConversationLookupRow = {
  id: string
}

type UserLookupRow = {
  id: string
  status: string
}

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const rows = await prisma.$queryRaw<ConversationListRow[]>`
      SELECT
        c.id,
        c."updatedAt",
        self_member."lastReadAt" AS "selfLastReadAt",
        other_user.id AS "otherUserId",
        other_user.name AS "otherUserName",
        other_user."preferredName" AS "otherUserPreferredName",
        other_user.email AS "otherUserEmail",
        other_user.image AS "otherUserImage",
        other_user.department AS "otherUserDepartment",
        other_user.position AS "otherUserPosition",
        latest_message.id AS "latestMessageId",
        latest_message.body AS "latestMessageBody",
        latest_message."createdAt" AS "latestMessageCreatedAt",
        latest_message."senderId" AS "latestMessageSenderId"
      FROM "Conversation" c
      JOIN "ConversationMember" self_member
        ON self_member."conversationId" = c.id
       AND self_member."userId" = ${session!.user.id}
      JOIN "ConversationMember" other_member
        ON other_member."conversationId" = c.id
       AND other_member."userId" <> ${session!.user.id}
      JOIN "User" other_user
        ON other_user.id = other_member."userId"
      LEFT JOIN LATERAL (
        SELECT m.id, m.body, m."createdAt", m."senderId"
        FROM "Message" m
        WHERE m."conversationId" = c.id
        ORDER BY m."createdAt" DESC
        LIMIT 1
      ) latest_message ON true
      ORDER BY c."updatedAt" DESC
    `

    const conversations = rows.map((row: ConversationListRow) => {
      const hasUnread = !!row.latestMessageId &&
        row.latestMessageSenderId !== session!.user.id &&
        (!row.selfLastReadAt || (!!row.latestMessageCreatedAt && row.latestMessageCreatedAt > row.selfLastReadAt))

      return {
        id: row.id,
        updatedAt: row.updatedAt,
        otherUser: {
          id: row.otherUserId,
          name: row.otherUserName,
          preferredName: row.otherUserPreferredName,
          email: row.otherUserEmail,
          image: row.otherUserImage,
          department: row.otherUserDepartment,
          position: row.otherUserPosition,
        },
        latestMessage: row.latestMessageId
          ? {
              id: row.latestMessageId,
              body: row.latestMessageBody!,
              createdAt: row.latestMessageCreatedAt!,
              senderId: row.latestMessageSenderId!,
            }
          : null,
        hasUnread,
      }
    })

    return NextResponse.json({ conversations })
  } catch (err) {
    console.error("Failed to load conversations", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load conversations" },
      { status: 500 }
    )
  }
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

    const targets = await prisma.$queryRaw<UserLookupRow[]>`
      SELECT id, status
      FROM "User"
      WHERE id = ${data.targetUserId}
      LIMIT 1
    `
    const target = targets[0] ?? null

    if (!target || target.status !== "active") {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    const directKey = buildDirectConversationKey(session!.user.id, data.targetUserId)
    const now = new Date()

    const conversation = await prisma.$transaction(async (tx) => {
      const createdId = randomUUID()
      const inserted = await tx.$queryRaw<ConversationLookupRow[]>`
        INSERT INTO "Conversation" ("id", "type", "directKey", "createdAt", "updatedAt")
        VALUES (${createdId}, ${"direct"}, ${directKey}, ${now}, ${now})
        ON CONFLICT ("directKey")
        DO UPDATE SET "updatedAt" = "Conversation"."updatedAt"
        RETURNING id
      `
      const resolvedConversation = inserted[0] ?? null

      if (!resolvedConversation) {
        throw new Error("Failed to resolve conversation.")
      }

      await tx.$executeRaw`
        INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "lastReadAt", "createdAt")
        VALUES (${randomUUID()}, ${resolvedConversation.id}, ${session!.user.id}, ${now}, ${now})
        ON CONFLICT ("conversationId", "userId")
        DO NOTHING
      `

      await tx.$executeRaw`
        INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "createdAt")
        VALUES (${randomUUID()}, ${resolvedConversation.id}, ${data.targetUserId}, ${now})
        ON CONFLICT ("conversationId", "userId")
        DO NOTHING
      `

      return resolvedConversation
    })

    return NextResponse.json({ conversationId: conversation.id })
  } catch (err) {
    console.error("Failed to create conversation", err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create conversation" },
      { status: 500 }
    )
  }
}
