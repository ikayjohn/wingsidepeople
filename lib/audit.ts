import { prisma } from "@/lib/prisma"

export async function logAudit(params: {
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  details?: unknown
  ip?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ip: params.ip || null,
      },
    })
  } catch {
    // Audit logs are best-effort and should not block primary flows.
  }
}

