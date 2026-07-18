import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { productionSchema, bulkDeleteSchema, cleanEmptyStrings } from '../lib/validators.js'

const router = Router()

const SORTABLE = ['date', 'workerName', 'department', 'design', 'pieces', 'rate', 'total', 'status', 'createdAt']

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined
  const workerId = req.query.workerId as string | undefined

  const searchObj = searchFilter(input.search, ['workerName', 'department', 'design', 'notes'])
  const where: any = searchObj ? { ...searchObj } : {}
  if (req.query.department && req.query.department !== 'all') where.department = req.query.department
  if (workerId && workerId !== 'all') where.workerId = workerId

  const allRows = await prisma.productionLog.findMany({ where })

  let filtered = allRows
  if (fromDate || toDate) {
    filtered = allRows.filter((r) => {
      if (!r.date) return false
      const [d, m, y] = r.date.split('-').map(Number)
      const rDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (fromDate && rDateStr < fromDate) return false
      if (toDate && rDateStr > toDate) return false
      return true
    })
  }

  const sortBy = input.sortBy && SORTABLE.includes(input.sortBy) ? input.sortBy : 'date'
  const sortDir = input.sortDir || 'desc'

  filtered.sort((a: any, b: any) => {
    const valA = a[sortBy]
    const valB = b[sortBy]

    if (sortBy === 'date') {
      const [da, ma, ya] = (a.date || '').split('-').map(Number)
      const [db, mb, yb] = (b.date || '').split('-').map(Number)
      const timeA = ya ? new Date(ya, ma - 1, da).getTime() : 0
      const timeB = yb ? new Date(yb, mb - 1, db).getTime() : 0
      return sortDir === 'asc' ? timeA - timeB : timeB - timeA
    }

    if (typeof valA === 'string') {
      return sortDir === 'asc'
        ? (valA || '').localeCompare(valB || '')
        : (valB || '').localeCompare(valA || '')
    }

    return sortDir === 'asc'
      ? (valA || 0) - (valB || 0)
      : (valB || 0) - (valA || 0)
  })

  const total = filtered.length
  const paginatedData = filtered.slice((input.page - 1) * input.pageSize, input.page * input.pageSize)

  res.json(toPaginated(paginatedData, total, input))
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const log = await prisma.productionLog.findUnique({ where: { id: req.params.id } })
  if (!log) throw new HttpError(404, 'Log not found', 'NOT_FOUND')
  res.json(log)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = cleanEmptyStrings(productionSchema.parse(req.body))
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

router.put('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = cleanEmptyStrings(productionSchema.parse(req.body))
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

router.post('/bulk-delete', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { ids } = bulkDeleteSchema.parse(req.body)
  await prisma.productionLog.deleteMany({
    where: { id: { in: ids } },
  })
  res.json({ message: `${ids.length} production logs deleted successfully` })
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.productionLog.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Log not found', 'NOT_FOUND')
  await prisma.productionLog.delete({ where: { id: req.params.id } })
  res.json({ message: 'Production log deleted successfully' })
}))

export default router