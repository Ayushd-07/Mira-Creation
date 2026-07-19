import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'

const router = Router()

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const { start, end } = todayRange()

  const [
    incomingToday,
    outgoingToday,
    incomingTodaySum,
    outgoingTodaySum,
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
    totalIncomingSum,
    totalOutgoingSum,
  ] = await Promise.all([
    prisma.incomingStock.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.outgoingStock.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.incomingStock.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    }),
    prisma.outgoingStock.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    }),
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
    prisma.incomingStock.aggregate({
      _sum: { total: true },
    }),
    prisma.outgoingStock.aggregate({
      _sum: { total: true },
    }),
  ])

  const productionEfficiency = totalProduction > 0 ? Math.round((completedWork / totalProduction) * 100) : 0

  res.json({
    incomingToday,
    outgoingToday,
    incomingTodayPrice: incomingTodaySum._sum.total || 0,
    outgoingTodayPrice: outgoingTodaySum._sum.total || 0,
    totalIncomingPrice: totalIncomingSum._sum.total || 0,
    totalOutgoingPrice: totalOutgoingSum._sum.total || 0,
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
}))

export default router