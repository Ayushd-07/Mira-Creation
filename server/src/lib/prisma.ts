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

// Seed default data if database is empty
async function seedIfEmpty() {
  try {
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      console.log('[Prisma] Database is empty. Seeding default admin and manager users...')
      const adminPass = await bcrypt.hash('admin123', 10)
      const managerPass = await bcrypt.hash('manager123', 10)

      await prisma.user.create({
        data: {
          email: 'admin@mira.com',
          name: 'Admin User',
          password: adminPass,
          role: 'admin',
        },
      })
      await prisma.user.create({
        data: {
          email: 'manager@mira.com',
          name: 'Manager User',
          password: managerPass,
          role: 'manager',
        },
      })
      console.log('[Prisma] Default users seeded successfully')

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
        console.log('[Prisma] Default settings seeded successfully')
      }
    }
  } catch (err) {
    console.error('[Prisma] Failed to auto-seed database:', err)
  }
}

// Log database connection status
prisma.$connect()
  .then(async () => {
    console.log('[Prisma] Database connected successfully')
    await seedIfEmpty()
  })
  .catch((err) => {
    console.error('[Prisma] Database connection failed:', err)
  })
