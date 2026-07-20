import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated, searchFilter } from '../lib/query.js'
import { outgoingSchema, bulkDeleteSchema, cleanEmptyStrings } from '../lib/validators.js'
import { getItemImageUrl } from '../lib/supabase.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

const SORTABLE = ['date', 'srNo', 'design', 'fabric', 'pieces', 'rate', 'total', 'customer', 'status', 'createdAt']

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = paginationSchema.parse(req.query)
  const fromDate = req.query.fromDate as string | undefined
  const toDate = req.query.toDate as string | undefined

  const where: any = searchFilter(input.search, ['srNo', 'design', 'fabric', 'customer', 'vehicleNumber', 'notes'])
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status

  const allRows = await prisma.outgoingStock.findMany({
    where,
    include: { item: true }
  })

  // Load matching items for older records (by srNo/itemCode or design/itemName)
  const itemsWithoutRelation = allRows.filter(r => !r.item)
  let resolvedItems: any[] = []
  if (itemsWithoutRelation.length > 0) {
    const codes = itemsWithoutRelation.map(r => r.srNo as string).filter(Boolean)
    const designs = itemsWithoutRelation.map(r => r.design as string).filter(Boolean)
    resolvedItems = await prisma.item.findMany({
      where: {
        OR: [
          { itemCode: { in: codes } },
          { itemName: { in: designs } }
        ]
      }
    })
  }

  // Map them together
  const rows = await Promise.all(allRows.map(async (r: any) => {
    let matched = r.item
    if (!matched) {
      // 1. Try matching by srNo -> itemCode first
      matched = r.srNo ? resolvedItems.find(i => i.itemCode === r.srNo) : null
      
      // 2. Fallback matching by design -> itemName (case insensitive)
      if (!matched && r.design) {
        matched = resolvedItems.find(i => i.itemName?.toLowerCase() === r.design.toLowerCase())
      }
    }
    
    if (matched) {
      return {
        ...r,
        item: {
          ...matched,
          itemImage: await getItemImageUrl(matched.itemImage)
        }
      }
    }
    return r
  }))

  let filtered = rows
  if (fromDate || toDate) {
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null

    filtered = rows.filter((r) => {
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

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await prisma.outgoingStock.findUnique({
    where: { id: req.params.id },
    include: { item: true }
  })
  if (!entry) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  
  let matched = entry.item
  if (!matched) {
    matched = entry.srNo ? await prisma.item.findUnique({ where: { itemCode: entry.srNo } }) : null
    if (!matched && entry.design) {
      matched = await prisma.item.findFirst({
        where: { itemName: { equals: entry.design, mode: 'insensitive' } }
      })
    }
  }
  if (matched) {
    (entry as any).item = {
      ...matched,
      itemImage: await getItemImageUrl(matched.itemImage)
    }
  }
  
  res.json(entry)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(outgoingSchema.parse(req.body))
  if (data.srNo) {
    const existing = await prisma.outgoingStock.findFirst({ where: { srNo: data.srNo } })
    if (existing) throw new HttpError(409, 'A shipment with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.outgoingStock.create({ data })
  
  await createAuditLog(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'add_outgoing',
    'outgoing',
    entry.id,
    `Added outgoing shipment (Fabric: ${entry.fabric}, Pieces: ${entry.pieces}, Customer: ${entry.customer || 'N/A'})`
  )
  
  res.status(201).json(entry)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(outgoingSchema.parse(req.body))
  const existing = await prisma.outgoingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  if (data.srNo) {
    const dup = await prisma.outgoingStock.findFirst({ where: { srNo: data.srNo, id: { not: req.params.id } } })
    if (dup) throw new HttpError(409, 'A shipment with this SR number already exists', 'DUPLICATE')
  }
  const entry = await prisma.outgoingStock.update({ where: { id: req.params.id }, data })
  
  await createAuditLog(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'edit_outgoing',
    'outgoing',
    entry.id,
    `Updated outgoing shipment (Fabric: ${entry.fabric}, Pieces: ${entry.pieces}, Customer: ${entry.customer || 'N/A'})`
  )
  
  res.json(entry)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.outgoingStock.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Entry not found', 'NOT_FOUND')
  await prisma.outgoingStock.delete({ where: { id: req.params.id } })
  
  await createAuditLog(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'delete_outgoing',
    'outgoing',
    req.params.id,
    `Deleted outgoing shipment (SR: ${existing.srNo || 'N/A'}, Fabric: ${existing.fabric})`
  )
  
  res.json({ message: 'Shipment deleted successfully' })
}))

router.post('/bulk-delete', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids } = bulkDeleteSchema.parse(req.body)
  const result = await prisma.outgoingStock.deleteMany({ where: { id: { in: ids } } })
  
  await createAuditLog(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'bulk_delete_outgoing',
    'outgoing',
    null,
    `Bulk deleted ${result.count} outgoing shipments`
  )
  
  res.json({ message: `${result.count} shipments deleted`, count: result.count })
}))

export default router