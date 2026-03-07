import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
