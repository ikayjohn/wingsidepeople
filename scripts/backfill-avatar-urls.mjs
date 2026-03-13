import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

process.loadEnvFile?.(".env")

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL

  if (databaseUrl?.startsWith("prisma://") || databaseUrl?.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    })
  }

  const runtimeUrl = databaseUrl || directDatabaseUrl
  if (!runtimeUrl) {
    throw new Error("Missing database connection string. Set DATABASE_URL or DIRECT_DATABASE_URL.")
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: runtimeUrl }),
  })
}

const prisma = createPrismaClient()

try {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { image: "/api/profile/photo" },
        { image: { startsWith: "/uploads/avatars/" } },
      ],
    },
    select: { id: true },
  })

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: `/api/profile/photo/${user.id}` },
    })
  }

  console.log(`Backfilled ${users.length} avatar URL(s).`)
} finally {
  await prisma.$disconnect()
}
