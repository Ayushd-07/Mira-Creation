import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { outgoingSchema, bulkDeleteSchema, cleanEmptyStrings } from '../lib/validators.js'

const router = Router()

const SORTABLE = ['date', 'srNo', 'design', 'fabric', 'pieces', 'rate', 'total', 'customer', 'status', 'createdAt']

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const where: any = searchFilter(input.search, ['srNo', 'design', 'fabric', 'customer', 'vehicleNumber', 'notes'])
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status
  const orderBy: any = {}
  if (input.sortBy && SORTABLE.includes(input.sortBy)) orderBy[input.sortBy] = input.sortDir
  else orderBy.date = 'desc'
  const [data, total] = await Promise.all([
    prisma.outgoingStock.findMany({ where, orderBy, ...buildPagination(input) }),
    prisma.outgoingStock.count({ where }),
  ])
  res.json(toPaginated(data, total, input))
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const entry = await prisma.outgoingStock.findUnique({ where: { id: req.params.id } })
  if (!entry) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  res.json(entry)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = cleanEmptyStrings(outgoingSchema.parse(req.body))
  if (data.srNo) {
    const existing = await prisma.outgoingStock.findFirst({ where: { srNo: data.srNo } })
    if (existing) throw new HttpError(409, 'A shipment with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.outgoingStock.create({ data })
  res.status(201).json(entry)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = cleanEmptyStrings(outgoingSchema.parse(req.body))
  const existing = await prisma.outgoingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  if (data.srNo) {
    const dup = await prisma.outgoingStock.findFirst({ where: { srNo: data.srNo, id: { not: req.params.id } } })
    if (dup) throw new HttpError(409, 'A shipment with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.outgoingStock.update({ where: { id: req.params.id }, data })
  res.json(entry)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.outgoingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  await prisma.outgoingStock.delete({ where: { id: req.params.id } })
  res.json({ message: 'Shipment deleted successfully' })
}))

router.post('/bulk-delete', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { ids } = bulkDeleteSchema.parse(req.body)
  const result = await prisma.outgoingStock.deleteMany({ where: { id: { in: ids } } })
  res.json({ message: `${result.count} shipments deleted`, count: result.count })
}))

export default router