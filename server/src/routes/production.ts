import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { productionSchema } from '../lib/validators.js'

const router = Router()

router.use(authenticate)

const SORTABLE = ['date', 'workerName', 'department', 'design', 'pieces', 'rate', 'total', 'status', 'createdAt']

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const where: any = searchFilter(input.search, ['workerName', 'department', 'design', 'notes'])
  if (req.query.department && req.query.department !== 'all') where.department = req.query.department
  const orderBy: any = {}
  if (input.sortBy && SORTABLE.includes(input.sortBy)) orderBy[input.sortBy] = input.sortDir
  else orderBy.date = 'desc'
  const [data, total] = await Promise.all([
    prisma.productionLog.findMany({ where, orderBy, ...buildPagination(input) }),
    prisma.productionLog.count({ where }),
  ])
  res.json(toPaginated(data, total, input))
}))

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const log = await prisma.productionLog.findUnique({ where: { id: req.params.id } })
  if (!log) throw new HttpError(404, 'Log not found', 'NOT_FOUND')
  res.json(log)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = productionSchema.parse(req.body)
  const worker = await prisma.worker.findUnique({ where: { id: data.workerId } })
  if (!worker) throw new HttpError(404, 'Selected worker does not exist', 'NOT_FOUND')
  const log = await prisma.productionLog.create({
    data: {
      date: data.date,
      workerId: data.workerId,
      workerName: worker.name,
      department: worker.department,
      design: data.design,
      pieces: data.pieces,
      rate: data.rate,
      total: (data.pieces || 0) * (data.rate || 0),
      notes: data.notes,
    },
  })
  res.status(201).json(log)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = productionSchema.parse(req.body)
  const existing = await prisma.productionLog.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Log not found', 'NOT_FOUND')
  const worker = await prisma.worker.findUnique({ where: { id: data.workerId } })
  if (!worker) throw new HttpError(404, 'Selected worker does not exist', 'NOT_FOUND')
  const log = await prisma.productionLog.update({
    where: { id: req.params.id },
    data: {
      date: data.date,
      workerId: data.workerId,
      workerName: worker.name,
      department: worker.department,
      design: data.design,
      pieces: data.pieces,
      rate: data.rate,
      total: (data.pieces || 0) * (data.rate || 0),
      notes: data.notes,
    },
  })
  res.json(log)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.productionLog.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Log not found', 'NOT_FOUND')
  await prisma.productionLog.delete({ where: { id: req.params.id } })
  res.json({ message: 'Production log deleted successfully' })
}))

export default router