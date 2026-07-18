import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { settingsSchema } from '../lib/validators.js'
import multer from 'multer'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'

const router = Router()

// Ensure local uploads directory exists. Only used as a fallback when cloud
// storage (Vercel Blob) is not configured (i.e. local development).
const uploadsDir = join(process.cwd(), 'uploads', 'logos')
if (!existsSync(uploadsDir)) {
  try {
    mkdirSync(uploadsDir, { recursive: true })
  } catch {
    // Non-fatal on read-only filesystems (e.g. Vercel serverless).
  }
}

// Use memory storage so the file buffer can be forwarded to cloud storage
// (Vercel Blob) in production without writing to the ephemeral filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Persistent storage is used when Vercel Blob is configured (BLOB_READ_WRITE_TOKEN
// is automatically provided once a Blob store is created in the Vercel project).
function useCloudStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

// Public endpoint for settings (used on login page)
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  let settings = await prisma.settings.findFirst()
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        companyName: 'Mira Creation Industrial',
        email: 'ops@miracreation.com',
        phone: '+1 (555) 902-4412',
        address: '724 Fabric District, Suite 400, New York, NY 10018',
        gstNumber: 'GST-0000000000',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
      },
    })
  }
  res.json(settings)
}))

router.put('/', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const parsed = settingsSchema.parse(req.body)
  // Build a plain object with both new form fields and legacy fields
  const data: any = { ...parsed }
  if (parsed.businessEmail) data.email = parsed.businessEmail
  if (parsed.businessPhone) data.phone = parsed.businessPhone
  if (parsed.addressLine1) data.address = parsed.addressLine1
  if (parsed.gstin) data.gstNumber = parsed.gstin

  const existing = await prisma.settings.findFirst()
  if (existing) {
    const updated = await prisma.settings.update({ where: { id: existing.id }, data })
    res.json(updated)
  } else {
    const created = await prisma.settings.create({
      data: {
        ...data,
        email: parsed.businessEmail || 'ops@miracreation.com',
        phone: parsed.businessPhone || '+1 (555) 902-4412',
        address: parsed.addressLine1 || '724 Fabric District, Suite 400, New York, NY 10018',
        gstNumber: parsed.gstin || 'GST-0000000000',
      }
    })
    res.status(201).json(created)
  }
}))

// Logo upload endpoint
router.post('/logo', authorize('admin'), upload.single('logo'), asyncHandler(async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded', code: 'NO_FILE' })
  }

  const existing = await prisma.settings.findFirst()
  if (!existing) {
    return res.status(404).json({ error: 'Settings not found', code: 'NOT_FOUND' })
  }

  const ext = (file.originalname.split('.').pop() || 'png').toLowerCase()
  let logoUrl: string

  if (useCloudStorage()) {
    // Persistent storage via Vercel Blob (survives serverless redeploys).
    const { put } = await import('@vercel/blob')
    const blob = await put(`logos/logo-${Date.now()}.${ext}`, file.buffer, {
      access: 'public',
      addRandomSuffix: true,
    })
    logoUrl = blob.url
  } else {
    // Local filesystem fallback (development / self-hosted only).
    const filename = `logo-${Date.now()}.${ext}`
    writeFileSync(join(uploadsDir, filename), file.buffer)
    logoUrl = `/uploads/logos/${filename}`
  }

  const updated = await prisma.settings.update({
    where: { id: existing.id },
    data: { logo: logoUrl },
  })

  res.json({ logoUrl, settings: updated })
}))

// Remove logo endpoint
router.delete('/logo', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.settings.findFirst()
  if (!existing) {
    return res.status(404).json({ error: 'Settings not found', code: 'NOT_FOUND' })
  }

  if (existing.logo) {
    if (useCloudStorage() && existing.logo.startsWith('http')) {
      // Delete from Vercel Blob.
      try {
        const { del } = await import('@vercel/blob')
        await del(existing.logo)
      } catch {
        // Ignore deletion errors (blob may already be gone).
      }
    } else {
      // Delete local file.
      const filePath = join(process.cwd(), existing.logo)
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath)
        }
      } catch {
        // File may not exist, ignore error.
      }
    }
  }

  const updated = await prisma.settings.update({
    where: { id: existing.id },
    data: { logo: null },
  })

  res.json({ settings: updated })
}))

export default router