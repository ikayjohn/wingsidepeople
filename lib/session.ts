import type { UserRole } from "@/lib/rbac"

export type AppSession = {
  user: {
    id: string
    role: UserRole
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

