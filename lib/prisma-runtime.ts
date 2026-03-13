import { prisma } from "@/lib/prisma"

export function hasPrismaDelegates(...keys: string[]) {
  const runtime = prisma as unknown as Record<string, unknown>
  return keys.every((key) => Boolean(runtime[key]))
}
