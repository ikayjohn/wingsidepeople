export function buildDirectConversationKey(userAId: string, userBId: string) {
  return [userAId, userBId].sort().join(":")
}

type MessageBroadcastPayload = {
  conversationId: string
  message: {
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
}

export function buildUserInboxTopic(userId: string) {
  return `user-inbox:${userId}`
}

export async function broadcastInboxMessage(userIds: string[], payload: MessageBroadcastPayload) {
  void userIds
  void payload
}
