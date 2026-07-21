import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Ensure default admin and manager users exist
async function ensureDefaultUsers() {
  try {
    const adminPass = await bcrypt.hash('admin123', 10)
    const managerPass = await bcrypt.hash('manager123', 10)

    await prisma.user.upsert({
      where: { email: 'admin@mira.com' },
      update: {},
      create: {
        email: 'admin@mira.com',
        name: 'Admin User',
        password: adminPass,
        role: 'admin',
      },
    })

    await prisma.user.upsert({
      where: { email: 'manager@mira.com' },
      update: {},
      create: {
        email: 'manager@mira.com',
        name: 'Manager User',
        password: managerPass,
        role: 'manager',
      },
    })

    const settingsCount = await prisma.settings.count()
    if (settingsCount === 0) {
      await prisma.settings.create({
        data: {
          companyName: 'Mira Creation Industrial',
          email: 'ops@miracreation.com',
          phone: '+1 (555) 902-4412',
          address: '724 Fabric District, Suite 400, New York, NY 10018',
          gstNumber: 'GST-0000000000',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
        },
      })
    }
  } catch (err) {
    console.error('[Prisma] Failed to ensure default users:', err)
  }
}

// Log database connection status and verify users
prisma.$connect()
  .then(async () => {
    console.log('[Prisma] Database connected successfully')
    await ensureDefaultUsers()
  })
  .catch((err: unknown) => {
    console.error('[Prisma] Database connection failed:', err)
  })
