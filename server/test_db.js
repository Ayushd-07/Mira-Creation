import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log('Seeded Users in DB:', users.map(u => ({ email: u.email, name: u.name, role: u.role })))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
