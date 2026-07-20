import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { runBackup } from '../lib/gdrive.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createAuditLog } from '../lib/audit.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()

// GET /api/backup/status
// Visible only to Admin users
router.get('/status', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const latestLog = await (prisma as any).backupLog.findFirst({
    orderBy: { completedAt: 'desc' }
  })
  res.json({
    latestLog
  })
}))

// POST /api/backup/run
// Manually run a backup (restricted to Admin)
router.post('/run', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!
  
  // Create an audit log for the initiation of manual backup
  await createAuditLog(
    user.id,
    user.name,
    user.role,
    'manual_backup_init',
    'backup',
    null,
    'Manual backup initiated by admin'
  )

  const result = await runBackup('manual')

  // Log successful/failed completion of backup
  await createAuditLog(
    user.id,
    user.name,
    user.role,
    result.status === 'success' ? 'manual_backup_success' : 'manual_backup_failure',
    'backup',
    null,
    result.error ? `Error: ${result.error.substring(0, 200)}` : `Records: ${result.recordCount}, Files: ${result.fileCount}`
  )

  if (result.status === 'failed') {
    return res.status(500).json({
      error: result.error || 'Manual backup synchronization failed.',
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

  if (clientSecret !== cronSecret) {
    // Audit failed attempt
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

  console.log('[Cron Backup] Cron backup authentication successful. Running backup...')

  await createAuditLog(
    null,
    'System Cron',
    'system',
    'cron_backup_init',
    'backup',
    null,
    'Scheduled daily cron backup triggered'
  )

  const result = await runBackup('cron')

  await createAuditLog(
    null,
    'System Cron',
    'system',
    result.status === 'success' ? 'cron_backup_success' : 'cron_backup_failure',
    'backup',
    null,
    result.error ? `Error: ${result.error.substring(0, 200)}` : `Records: ${result.recordCount}, Files: ${result.fileCount}`
  )

  if (result.status === 'failed') {
    return res.status(500).json({
      error: result.error || 'Cron backup synchronization failed.',
      code: 'BACKUP_FAILED',
      result
    })
  }

  res.json(result)
})

// Support both GET and POST requests for automated daily backup
router.get('/cron', handleCronBackup)
router.post('/cron', handleCronBackup)

export default router

