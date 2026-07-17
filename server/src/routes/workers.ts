import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { workerSchema } from '../lib/validators.js'

const router = Router()

router.use(authenticate)

const z_status = z.object({ status: z.enum(['Active', 'Inactive', 'On Leave']) })
const SORTABLE = ['name', 'workerId', 'department', 'phone', 'status', 'createdAt', 'joiningDate']

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const where: any = searchFilter(input.search, ['name', 'workerId', 'department', 'phone', 'email'])
  if (req.query.department && req.query.department !== 'all') where.department = req.query.department
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status

  const orderBy: any = {}
  if (input.sortBy && SORTABLE.includes(input.sortBy)) orderBy[input.sortBy] = input.sortDir
  else orderBy.createdAt = 'desc'

  const [data, total] = await Promise.all([
    prisma.worker.findMany({ where, orderBy, ...buildPagination(input) }),
    prisma.worker.count({ where }),
  ])
  res.json(toPaginated(data, total, input))
}))

router.get('/all', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const workers = await prisma.worker.findMany({ orderBy: { name: 'asc' } })
  res.json(workers)
}))

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { id: req.params.id } })
  if (!worker) throw new HttpError(404, 'Worker not found', 'NOT_FOUND')
  res.json(worker)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = workerSchema.parse(req.body)
  const existing = await prisma.worker.findUnique({ where: { workerId: data.workerId } })
  if (existing) throw new HttpError(409, 'A worker with this ID already exists', 'DUPLICATE')
  const worker = await prisma.worker.create({ data })
  res.status(201).json(worker)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = workerSchema.parse(req.body)
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Worker not found', 'NOT_FOUND')
  const dup = await prisma.worker.findFirst({ where: { workerId: data.workerId, NOT: { id: req.params.id } } })
  if (dup) throw new HttpError(409, 'A worker with this ID already exists', 'DUPLICATE')
  const worker = await prisma.worker.update({ where: { id: req.params.id }, data })
  res.json(worker)
}))

router.patch('/:id/status', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = z_status.parse(req.body)
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Worker not found', 'NOT_FOUND')
  const worker = await prisma.worker.update({ where: { id: req.params.id }, data: { status } })
  res.json(worker)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.worker.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Worker not found', 'NOT_FOUND')
  await prisma.worker.delete({ where: { id: req.params.id } })
  res.json({ message: 'Worker deleted successfully' })
}))

export default router