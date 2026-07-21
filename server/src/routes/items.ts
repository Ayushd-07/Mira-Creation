import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginationSchema, buildPagination, toPaginated } from '../lib/query.js'
import { itemSchema, cleanEmptyStrings } from '../lib/validators.js'
import multer from 'multer'
import { uploadItemImage, deleteItemImage, getItemImageUrl } from '../lib/supabase.js'
import { allowedImageMimeTypes, isAllowedImageExtension, assertSafeImageUpload } from '../lib/uploadSecurity.js'
import { createAuditLog } from '../lib/audit.js'
import { syncRecordCreate, syncRecordUpdate, syncRecordDelete } from '../lib/google-sheets-sync.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (allowedImageMimeTypes.includes(file.mimetype) && isAllowedImageExtension(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed.'))
    }
  },
})

// Get items (paginated and filtered)
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const input = paginationSchema.parse(req.query)

  const where: any = {}
  if (req.query.search) {
    const searchVal = req.query.search as string
    where.OR = [
      { itemCode: { contains: searchVal, mode: 'insensitive' } },
      { itemName: { contains: searchVal, mode: 'insensitive' } },
      { fabricName: { contains: searchVal, mode: 'insensitive' } },
    ]
  } else {
    if (req.query.itemCode) {
      where.itemCode = { contains: req.query.itemCode as string, mode: 'insensitive' }
    }
    if (req.query.itemName) {
      where.itemName = { contains: req.query.itemName as string, mode: 'insensitive' }
    }
    if (req.query.fabricName) {
      where.fabricName = { contains: req.query.fabricName as string, mode: 'insensitive' }
    }
  }
  if (req.query.status && req.query.status !== 'all') {
    where.status = req.query.status as string
  }

  const orderBy: any = {}
  if (input.sortBy) {
    orderBy[input.sortBy] = input.sortDir
  } else {
    orderBy.createdAt = 'desc'
  }

  const [data, total] = await Promise.all([
    prisma.item.findMany({ where, orderBy, ...buildPagination(input) }),
    prisma.item.count({ where }),
  ])

  const resolvedData = await Promise.all(data.map(async (item) => ({
    ...item,
    itemImage: await getItemImageUrl(item.itemImage)
  })))

  res.json(toPaginated(resolvedData, total, input))
}))

// Get single item details
router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } })
  if (!item) throw new HttpError(404, 'Item not found', 'NOT_FOUND')
  item.itemImage = await getItemImageUrl(item.itemImage)
  res.json(item)
}))

// Create new item
router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(itemSchema.parse(req.body))
  
  const existing = await prisma.item.findUnique({ where: { itemCode: data.itemCode } })
  if (existing) throw new HttpError(409, 'An item with this Item Code already exists', 'DUPLICATE')

  const item = await prisma.item.create({ data })
  item.itemImage = await getItemImageUrl(item.itemImage)

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'item_create', 'items', item.id, `Created item code: ${item.itemCode}`)
  }

  syncRecordCreate('item', item)

  res.status(201).json(item)
}))

// Update item details
router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(itemSchema.parse(req.body))

  const existing = await prisma.item.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Item not found', 'NOT_FOUND')

  const dup = await prisma.item.findFirst({
    where: { itemCode: data.itemCode, NOT: { id: req.params.id } }
  })
  if (dup) throw new HttpError(409, 'An item with this Item Code already exists', 'DUPLICATE')

  // Safe image cleanup if image is replaced or removed
  if (existing.itemImage && existing.itemImage !== (data.itemImage || null)) {
    await deleteItemImage(existing.itemImage)
  }

  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: {
      itemCode: data.itemCode,
      itemName: data.itemName || null,
      fabricName: data.fabricName,
      itemImage: data.itemImage || null,
      remark: data.remark || null,
      status: data.status,
    }
  })
  item.itemImage = await getItemImageUrl(item.itemImage)

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'item_update', 'items', item.id, `Updated item code: ${item.itemCode}`)
  }

  syncRecordUpdate('item', item.id, item)

  res.json(item)
}))

// Delete item
router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Item not found', 'NOT_FOUND')

  // Safely delete associated image
  if (existing.itemImage) {
    await deleteItemImage(existing.itemImage)
  }

  await prisma.item.delete({ where: { id: req.params.id } })

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'item_delete', 'items', req.params.id, `Deleted item code: ${existing.itemCode}`)
  }

  syncRecordDelete('item', req.params.id)

  res.json({ message: 'Item deleted successfully' })
}))

// Upload item image
router.post('/upload', authorize('admin'), upload.single('image'), asyncHandler(async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded', code: 'NO_FILE' })
  }

  const safeImage = assertSafeImageUpload(file)
  const imageUrl = await uploadItemImage(file.buffer, `upload.${safeImage.ext}`, safeImage.mimeType)

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'item_image_upload', 'items', null, 'Uploaded item image')
  }

  res.json({ imageUrl })
}))

export default router

