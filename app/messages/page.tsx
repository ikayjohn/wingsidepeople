import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MessagesInbox from "@/components/MessagesInbox"

export default async function MessagesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return <MessagesInbox currentUserId={session.user.id} />
}
