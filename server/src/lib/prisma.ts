import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Log database connection status
prisma.$connect()
  .then(() => {
    console.log('[Prisma] Database connected successfully')
  })
  .catch((err) => {
    console.error('[Prisma] Database connection failed:', err)
  })
