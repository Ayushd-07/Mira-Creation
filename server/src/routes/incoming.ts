import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { incomingSchema, bulkDeleteSchema } from '../lib/validators.js'

const router = Router()

router.use(authenticate)

const SORTABLE = ['date', 'srNo', 'design', 'fabric', 'pieces', 'rate', 'total', 'supplier', 'createdAt']

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const where: any = searchFilter(input.search, ['srNo', 'design', 'fabric', 'supplier', 'notes'])
  const orderBy: any = {}
  if (input.sortBy && SORTABLE.includes(input.sortBy)) orderBy[input.sortBy] = input.sortDir
  else orderBy.date = 'desc'
  const [data, total] = await Promise.all([
    prisma.incomingStock.findMany({ where, orderBy, ...buildPagination(input) }),
    prisma.incomingStock.count({ where }),
  ])
  res.json(toPaginated(data, total, input))
}))

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await prisma.incomingStock.findUnique({ where: { id: req.params.id } })
  if (!entry) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  res.json(entry)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = incomingSchema.parse(req.body)
  if (data.srNo) {
    const existing = await prisma.incomingStock.findFirst({ where: { srNo: data.srNo } })
    if (existing) throw new HttpError(409, 'An entry with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.incomingStock.create({data})
  res.status(201).json(entry)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = incomingSchema.parse(req.body)
  const existing = await prisma.incomingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  if (data.srNo) {
    const dup = await prisma.incomingStock.findFirst({ where: { srNo: data.srNo, id: { not: req.params.id } } })
    if (dup) throw new HttpError(409, 'An entry with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.incomingStock.update({ where: { id: req.params.id }, data })
  res.json(entry)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.incomingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  await prisma.incomingStock.delete({ where: { id: req.params.id } })
  res.json({ message: 'Entry deleted successfully' })
}))

router.post('/bulk-delete', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids } = bulkDeleteSchema.parse(req.body)
  const result = await prisma.incomingStock.deleteMany({ where: { id: { in: ids } } })
  res.json({ message: `${result.count} entries deleted`, count: result.count })
}))

export default router