import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  const { start, end } = todayRange()

  const [
    incomingToday,
    outgoingToday,
    totalWorkers,
    activeWorkers,
    onDutyWorkers,
    pendingWork,
    completedWork,
    lowStockAlerts,
    recentIncoming,
    recentOutgoing,
    totalIncoming,
    totalOutgoing,
    totalProduction,
  ] = await Promise.all([
    prisma.incomingStock.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.outgoingStock.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.worker.count(),
    prisma.worker.count({ where: { status: 'Active' } }),
    prisma.worker.count({ where: { status: 'Active' } }),
    prisma.productionLog.count({ where: { status: { in: ['In Progress', 'Pending'] } } }),
    prisma.productionLog.count({ where: { status: 'Completed' } }),
    prisma.incomingStock.count({ where: { pieces: { lt: 200 } } }),
    prisma.incomingStock.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.outgoingStock.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.incomingStock.count(),
    prisma.outgoingStock.count(),
    prisma.productionLog.count(),
  ])

  const productionEfficiency = totalProduction > 0 ? Math.round((completedWork / totalProduction) * 100) : 0

  res.json({
    incomingToday,
    outgoingToday,
    workersActive: activeWorkers,
    productionEfficiency,
    pendingWork,
    completedWork,
    lowStockAlerts,
    workersOnDuty: onDutyWorkers,
    totalWorkers,
    totalIncoming,
    totalOutgoing,
    totalProduction,
    recentIncoming,
    recentOutgoing,
  })
})

export default router