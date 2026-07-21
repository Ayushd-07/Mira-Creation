import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { settingsSchema, cleanEmptyStrings } from '../lib/validators.js'
import multer from 'multer'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { uploadItemImage } from '../lib/supabase.js'
import { allowedImageMimeTypes, isAllowedImageExtension, assertSafeImageUpload } from '../lib/uploadSecurity.js'
import { createAuditLog } from '../lib/audit.js'

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
  fileFilter: (_req, file, cb) => {
    if (allowedImageMimeTypes.includes(file.mimetype) && isAllowedImageExtension(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed.'))
    }
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
        logo: '/uploads/logos/logo-1784355081400.png',
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

router.put('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = cleanEmptyStrings(settingsSchema.parse(req.body))
  // Build a plain object with both new form fields and legacy fields
  const data: any = { ...parsed }
  if (parsed.businessEmail) data.email = parsed.businessEmail
  if (parsed.businessPhone) data.phone = parsed.businessPhone
  if (parsed.addressLine1) data.address = parsed.addressLine1
  if (parsed.gstin) data.gstNumber = parsed.gstin

  const existing = await prisma.settings.findFirst()
  let result: any
  if (existing) {
    result = await prisma.settings.update({ where: { id: existing.id }, data })
  } else {
    result = await prisma.settings.create({
      data: {
        ...data,
        email: parsed.businessEmail || 'ops@miracreation.com',
        phone: parsed.businessPhone || '+1 (555) 902-4412',
        address: parsed.addressLine1 || '724 Fabric District, Suite 400, New York, NY 10018',
        gstNumber: parsed.gstin || 'GST-0000000000',
      }
    })
  }

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'settings_update', 'settings', result.id, `Updated company settings for ${result.companyName}`)
  }

  res.json(result)
}))

// Logo upload endpoint
router.post('/logo', authorize('admin'), upload.single('logo'), asyncHandler(async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded', code: 'NO_FILE' })
  }

  const existing = await prisma.settings.findFirst()
  if (!existing) {
    return res.status(404).json({ error: 'Settings not found', code: 'NOT_FOUND' })
  }

  // Delete previous logo if exists
  if (existing.logo) {
    if (existing.logo.startsWith('http')) {
      if (existing.logo.includes('public.blob.vercel-storage.com')) {
        try {
          const { del } = await import('@vercel/blob')
          await del(existing.logo)
        } catch {
          // Ignore deletion errors
        }
      }
    } else {
      const filePath = join(process.cwd(), existing.logo)
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath)
        }
      } catch {
        // Ignore deletion errors
      }
    }
  }

  // Upload logo (handles cloud storage correctly)
  const safeImage = assertSafeImageUpload(file)
  const logoUrl = await uploadItemImage(file.buffer, `logo.${safeImage.ext}`, safeImage.mimeType)

  const updated = await prisma.settings.update({
    where: { id: existing.id },
    data: { logo: logoUrl },
  })

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'settings_logo_upload', 'settings', updated.id, 'Uploaded new company logo')
  }

  res.json({ logoUrl, settings: updated })
}))

// Remove logo endpoint
router.delete('/logo', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
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

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'settings_logo_remove', 'settings', updated.id, 'Removed company logo')
  }

  res.json({ settings: updated })
}))


// Dynamic manifest endpoint that returns the PWA manifest JSON dynamically containing the uploaded logo url
router.get('/pwa-manifest.json', asyncHandler(async (_req: Request, res: Response) => {
  const settings = await prisma.settings.findFirst()
  const logo = settings?.logo || '/favicon.png'
  
  res.setHeader('Content-Type', 'application/manifest+json')
  res.json({
    name: 'Mira Creation',
    short_name: 'Mira Creation',
    description: 'Mira Creation Manufacturing ERP System',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: logo,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: logo,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: logo,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  })
}))

export default router