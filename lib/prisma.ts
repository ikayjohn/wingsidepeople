import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL

  // Fall back to accelerateUrl for prisma:// or prisma+postgres:// protocols
  if (databaseUrl?.startsWith('prisma://') || databaseUrl?.startsWith('prisma+postgres://')) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    })
  }

  // Runtime should prefer DATABASE_URL (typically pooled on hosted providers).
  // DIRECT_DATABASE_URL is kept as a fallback for local/dev or direct connections.
  const runtimeUrl = databaseUrl || directDatabaseUrl
  if (runtimeUrl) {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: runtimeUrl }),
    })
  }

  throw new Error('Missing database connection string. Set DATABASE_URL or DIRECT_DATABASE_URL.')
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
