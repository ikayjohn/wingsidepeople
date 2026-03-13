import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PortalShell from "@/components/PortalShell"

export default async function MyKpisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return <PortalShell session={session}>{children}</PortalShell>
}
