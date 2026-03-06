import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessAdminArea } from "@/lib/rbac"
import AdminShellNav from "@/components/AdminShellNav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!canAccessAdminArea(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminShellNav role={session.user.role} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
