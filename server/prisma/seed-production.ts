/**
 * Production-safe seed script for Neon PostgreSQL.
 * 
 * This script is designed to be run AFTER migrations on the production database.
 * It creates the default admin/manager users and initial settings if they don't exist.
 * 
 * IMPORTANT: This uses the same DATABASE_URL as the app, so it works with Neon.
 * 
 * Usage:
 *   npx tsx server/prisma/seed-production.ts
 * 
 * Or via npm:
 *   npm run seed:production
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedProduction() {
  console.log('🌱 Starting production seed...')
  console.log('📊 Database:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || 'not set')

  try {
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // Create default users
    console.log('👤 Creating default users...')
    const adminPass = await bcrypt.hash('admin123', 10)
    const managerPass = await bcrypt.hash('manager123', 10)

    const admin = await prisma.user.upsert({
      where: { email: 'admin@mira.com' },
      update: {},
      create: {
        email: 'admin@mira.com',
        name: 'Admin User',
        password: adminPass,
        role: 'admin',
      },
    })
    console.log('✅ Admin user created/updated:', admin.email)

    const manager = await prisma.user.upsert({
      where: { email: 'manager@mira.com' },
      update: {},
      create: {
        email: 'manager@mira.com',
        name: 'Manager User',
        password: managerPass,
        role: 'manager',
      },
    })
    console.log('✅ Manager user created/updated:', manager.email)

    // Create default settings if not exists
    console.log('⚙️  Creating default settings...')
    const existingSettings = await prisma.settings.findFirst()
    if (!existingSettings) {
      const settings = await prisma.settings.create({
        data: {
          companyName: 'Mira Creation Industrial',
          logo: '/uploads/logos/logo-1784355081400.png',
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
      console.log('✅ Default settings created')
    } else {
      console.log('ℹ️  Settings already exist, skipping')
    }

    console.log('🎉 Production seed completed successfully!')
    console.log('')
    console.log('📋 Default credentials:')
    console.log('   Admin:    admin@mira.com / admin123')
    console.log('   Manager:  manager@mira.com / manager123')
    console.log('')
    console.log('⚠️  IMPORTANT: Change these passwords after first login!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedProduction()