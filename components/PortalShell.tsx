import type { ReactNode } from "react"
import type { AppSession } from "@/lib/session"
import Navbar from "@/components/Navbar"

export default function PortalShell({
  session,
  children,
}: {
  session: AppSession
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar session={session} />
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
