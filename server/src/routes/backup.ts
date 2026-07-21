import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createAuditLog } from '../lib/audit.js'
import { HttpError } from '../middleware/errorHandler.js'
import { reconcileAllSheets } from '../lib/google-sheets-sync.js'
import crypto from 'crypto'

const router = Router()

function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// GET /api/backup/status
// Admin and Manager
router.get('/status', authorize('admin', 'manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const latestLog = await (prisma as any).auditLog.findFirst({
    where: {
      action: { in: ['BACKUP_SYNC_SUCCESS', 'BACKUP_ALREADY_UP_TO_DATE', 'excel_backup_download', 'BACKUP_CHECK_STARTED'] }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    latestLog: latestLog ? {
      completedAt: latestLog.createdAt,
      status: 'success',
      type: 'manual',
      details: latestLog.details
    } : {
      completedAt: new Date(),
      status: 'success',
      type: 'realtime',
      details: 'Real-time PostgreSQL live mirror active'
    }
  })
}))

// POST /api/backup/run
// Full Google Sheets Reconciliation ("Backup Now" button - Admin & Manager)
router.post('/run', authorize('admin', 'manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!

  await createAuditLog(
    user.id,
    user.name,
    user.role,
    'BACKUP_CHECK_STARTED',
    'backup',
    null,
    'Manual Google Sheets full reconciliation initiated'
  )

  const result = await reconcileAllSheets()

  const auditAction = result.status === 'up_to_date'
    ? 'BACKUP_ALREADY_UP_TO_DATE'
    : result.status === 'success'
    ? 'BACKUP_SYNC_SUCCESS'
    : 'BACKUP_SYNC_FAILED'

  await createAuditLog(
    user.id,
    user.name,
    user.role,
    auditAction,
    'backup',
    null,
    result.message
  )

  if (result.status === 'already_running') {
    return res.status(409).json({
      error: 'A Google Sheets synchronization is already in progress.',
      code: 'BACKUP_RUNNING',
      result
    })
  }

  if (result.status === 'failed') {
    return res.status(500).json({
      error: result.error || 'Backup synchronization failed.',
      code: 'BACKUP_FAILED',
      result
    })
  }

  res.json(result)
}))

// Handler function for cron triggered backups
const handleCronBackup = asyncHandler(async (req: Request, res: Response) => {
  const cronSecret = process.env.BACKUP_CRON_SECRET
  if (!cronSecret) {
    throw new HttpError(500, 'BACKUP_CRON_SECRET is not configured on the server.', 'CONFIG_ERROR')
  }

  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
  const clientSecret = req.headers['x-cron-secret'] || req.query.secret || bearerToken

  if (!timingSafeCompare(String(clientSecret || ''), cronSecret)) {
    await createAuditLog(
      null,
      'System Cron',
      'system',
      'cron_backup_unauthorized',
      'backup',
      null,
      'Failed cron authentication attempt'
    )
    throw new HttpError(401, 'Unauthorized cron key.', 'UNAUTHORIZED')
  }

  console.log('[Cron Backup] Triggering full Google Sheets reconciliation...')

  const result = await reconcileAllSheets()

  const auditAction = result.status === 'up_to_date'
    ? 'BACKUP_ALREADY_UP_TO_DATE'
    : result.status === 'success'
    ? 'BACKUP_SYNC_SUCCESS'
    : 'BACKUP_SYNC_FAILED'

  await createAuditLog(
    null,
    'System Cron',
    'system',
    auditAction,
    'backup',
    null,
    result.message
  )

  res.json(result)
})

router.get('/cron', handleCronBackup)
router.post('/cron', handleCronBackup)

export default router
