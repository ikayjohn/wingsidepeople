export function buildDirectConversationKey(userAId: string, userBId: string) {
  return [userAId, userBId].sort().join(":")
}
