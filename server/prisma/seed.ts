import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPass = await bcrypt.hash('admin123', 10)
  const managerPass = await bcrypt.hash('manager123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@mira.com' },
    update: { name: 'Admin User', password: adminPass, role: 'admin' },
    create: { email: 'admin@mira.com', name: 'Admin User', password: adminPass, role: 'admin' },
  })
  await prisma.user.upsert({
    where: { email: 'manager@mira.com' },
    update: { name: 'Manager User', password: managerPass, role: 'manager' },
    create: { email: 'manager@mira.com', name: 'Manager User', password: managerPass, role: 'manager' },
  })

  const deptNames = ['Stitching', 'Cutting', 'Quality Control', 'Finishing', 'Packaging', 'Design']
  for (const name of deptNames) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} department` },
    })
  }

  const workers = [
    { name: 'Elena Rodriguez', workerId: '#MIRA-2041', department: 'Stitching', phone: '+1 (555) 012-3456', email: 'elena@mira.com', salary: 2800, joiningDate: '2023-06-15', status: 'Active' },
    { name: 'Marcus Chen', workerId: '#MIRA-2088', department: 'Quality Control', phone: '+1 (555) 098-7654', email: 'marcus@mira.com', salary: 3200, joiningDate: '2023-08-01', status: 'Active' },
    { name: 'Sarah Jamila', workerId: '#MIRA-1922', department: 'Cutting', phone: '+1 (555) 234-5678', email: 'sarah@mira.com', salary: 2600, joiningDate: '2022-11-20', status: 'Inactive' },
    { name: 'Priya Sharma', workerId: '#MIRA-2101', department: 'Finishing', phone: '+1 (555) 345-6789', email: 'priya@mira.com', salary: 2500, joiningDate: '2024-01-10', status: 'Active' },
    { name: 'Raj Patel', workerId: '#MIRA-2105', department: 'Stitching', phone: '+1 (555) 456-7890', email: 'raj@mira.com', salary: 2700, joiningDate: '2024-02-05', status: 'Active' },
    { name: 'Anita Desai', workerId: '#MIRA-1956', department: 'Cutting', phone: '+1 (555) 567-8901', email: 'anita@mira.com', salary: 2550, joiningDate: '2023-03-12', status: 'Active' },
    { name: 'Vikram Singh', workerId: '#MIRA-2110', department: 'Stitching', phone: '+1 (555) 678-9012', email: 'vikram@mira.com', salary: 2900, joiningDate: '2024-04-20', status: 'On Leave' },
    { name: 'Leila Okafor', workerId: '#MIRA-2033', department: 'Finishing', phone: '+1 (555) 789-0123', email: 'leila@mira.com', salary: 2400, joiningDate: '2023-09-01', status: 'Active' },
  ]

  const createdWorkers: Record<string, string> = {}
  for (const w of workers) {
    const existing = await prisma.worker.findUnique({ where: { workerId: w.workerId } })
    if (existing) {
      createdWorkers[w.workerId] = existing.id
    } else {
      const created = await prisma.worker.create({ data: w })
      createdWorkers[w.workerId] = created.id
    }
  }

  const incomingSeed = [
    { date: '2024-10-24', srNo: '#INC-9821', design: 'Azure Silk Tunic', fabric: 'Premium Crepe', pieces: 450, rate: 12.5, supplier: 'Fabric World Inc.', notes: 'Quality check passed' },
    { date: '2024-10-24', srNo: '#INC-9820', design: 'Crimson Velour Coat', fabric: 'Synthetic Velvet', pieces: 120, rate: 45.0, supplier: 'Velvet Mills' },
    { date: '2024-10-23', srNo: '#INC-9819', design: 'Onyx Denim Pants', fabric: 'Premium Cotton', pieces: 600, rate: 8.75, supplier: 'Denim Co.', notes: 'Bulk order' },
    { date: '2024-10-23', srNo: '#INC-9818', design: 'Linen Blend Shirt', fabric: 'Italian Crepe', pieces: 240, rate: 15.0, supplier: 'Textile Hub' },
    { date: '2024-10-22', srNo: '#INC-9817', design: 'Summer Breeze A-102', fabric: 'Mulberry Silk', pieces: 800, rate: 22.0, supplier: 'Silk Road Traders' },
    { date: '2024-10-22', srNo: '#INC-9816', design: 'Classic Kurti Elite', fabric: 'Cotton Silk', pieces: 350, rate: 18.0, supplier: 'Kurti House', notes: 'Sample batch' },
    { date: '2024-10-21', srNo: '#INC-9815', design: 'Velvet Rose Gala', fabric: 'Synthetic Velvet', pieces: 200, rate: 48.0, supplier: 'Luxury Fabrics' },
    { date: '2024-10-21', srNo: '#INC-9814', design: 'Pastel Polo Knit', fabric: 'Premium Cotton', pieces: 500, rate: 6.5, supplier: 'Cotton Kings' },
  ]
  for (const e of incomingSeed) {
    await prisma.incomingStock.upsert({
      where: { srNo: e.srNo },
      update: {},
      create: { ...e, total: e.pieces * e.rate },
    })
  }

  const outgoingSeed = [
    { date: '2024-10-24', srNo: '#OUT-4512', design: 'Floral Summer Dress', fabric: 'Premium Cotton', pieces: 300, rate: 25.0, customer: 'Fashion Forward Ltd.', dispatchDate: '2024-10-25', vehicleNumber: 'MH-12-AB-1234', status: 'Pending' },
    { date: '2024-10-24', srNo: '#OUT-4511', design: 'Pastel Polo Knit', fabric: 'Premium Cotton', pieces: 150, rate: 18.0, customer: 'Urban Style', dispatchDate: '2024-10-24', vehicleNumber: 'MH-14-CD-5678', status: 'Delivered' },
    { date: '2024-10-22', srNo: '#OUT-4510', design: 'Midnight Blazer', fabric: 'Synthetic Velvet', pieces: 85, rate: 85.0, customer: 'Elite Garments', dispatchDate: '2024-10-23', vehicleNumber: 'MH-10-EF-9012', status: 'Delivered' },
    { date: '2024-10-22', srNo: '#OUT-4509', design: 'Cargo Khaki Skirt', fabric: 'Italian Crepe', pieces: 420, rate: 14.5, customer: 'Trendy Wear', dispatchDate: '2024-10-24', vehicleNumber: 'MH-16-GH-3456', status: 'Cancelled', notes: 'Order cancelled by customer' },
    { date: '2024-10-21', srNo: '#OUT-4508', design: 'Classic Kurti Elite', fabric: 'Cotton Silk', pieces: 500, rate: 35.0, customer: 'Kurti World', dispatchDate: '2024-10-22', vehicleNumber: 'MH-22-IJ-7890', status: 'Delivered' },
    { date: '2024-10-20', srNo: '#OUT-4507', design: 'Summer Breeze A-102', fabric: 'Mulberry Silk', pieces: 600, rate: 42.0, customer: 'Designer Boutique', dispatchDate: '2024-10-21', vehicleNumber: 'MH-08-KL-1111', status: 'Delivered' },
  ]
  for (const e of outgoingSeed) {
    await prisma.outgoingStock.upsert({
      where: { srNo: e.srNo },
      update: {},
      create: { ...e, total: e.pieces * e.rate },
    })
  }

  const productionSeed = [
    { date: '2024-10-24', workerId: '#MIRA-2041', design: 'Azure Silk Tunic', pieces: 120, rate: 2.5, status: 'In Progress' },
    { date: '2024-10-24', workerId: '#MIRA-2088', design: 'Crimson Velour Coat', pieces: 85, rate: 3.0, status: 'Completed' },
    { date: '2024-10-23', workerId: '#MIRA-1922', design: 'Onyx Denim Pants', pieces: 200, rate: 1.8, status: 'Completed' },
    { date: '2024-10-23', workerId: '#MIRA-2041', design: 'Linen Blend Shirt', pieces: 150, rate: 2.5, status: 'Completed' },
    { date: '2024-10-22', workerId: '#MIRA-2101', design: 'Velvet Rose Gala', pieces: 60, rate: 4.0, status: 'On Hold', notes: 'Awaiting fabric' },
    { date: '2024-10-22', workerId: '#MIRA-2105', design: 'Pastel Polo Knit', pieces: 300, rate: 2.0, status: 'Completed' },
    { date: '2024-10-21', workerId: '#MIRA-1956', design: 'Classic Kurti Elite', pieces: 400, rate: 1.5, status: 'Completed' },
    { date: '2024-10-21', workerId: '#MIRA-2088', design: 'Summer Breeze A-102', pieces: 250, rate: 3.0, status: 'Completed' },
  ]
  for (const p of productionSeed) {
    const wid = createdWorkers[p.workerId]
    if (!wid) continue
    const worker = await prisma.worker.findUnique({ where: { id: wid } })
    if (!worker) continue
    const existing = await prisma.productionLog.findFirst({ where: { date: p.date, workerId: wid, design: p.design } })
    if (!existing) {
      await prisma.productionLog.create({
        data: {
          date: p.date,
          workerId: wid,
          workerName: worker.name,
          department: worker.department,
          design: p.design,
          pieces: p.pieces,
          rate: p.rate,
          total: p.pieces * p.rate,
          status: p.status,
          notes: p.notes,
        },
      })
    }
  }

  // Settings uses auto-generated cuid(), so we use findFirst/update pattern
  let settings = await prisma.settings.findFirst()
  if (!settings) {
    await prisma.settings.create({
      data: {
        companyName: 'Mira Creation Industrial',
        email: 'ops@miracreation.com',
        phone: '+1 (555) 902-4412',
        address: '724 Fabric District, Suite 400, New York, NY 10018',
        gstNumber: 'GST-0000000000',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
      },
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })