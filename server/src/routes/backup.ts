import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createAuditLog } from '../lib/audit.js'
import { generateERPExcelReport, type ExcelBackupData } from '../lib/excel-generator.js'

const router = Router()

// GET /api/backup/excel
// Direct Excel Backup Download (Restricted to Admin)
router.get('/excel', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!

  // 1. Query all business database tables
  const tables = [
    { name: 'users', modelName: 'user' },
    { name: 'workers', modelName: 'worker' },
    { name: 'incoming', modelName: 'incomingStock' },
    { name: 'outgoing', modelName: 'outgoingStock' },
    { name: 'production', modelName: 'productionLog' },
    { name: 'departments', modelName: 'department' },
    { name: 'settings', modelName: 'settings' },
    { name: 'items', modelName: 'item' },
    { name: 'audit-logs', modelName: 'auditLog' }
  ]

  const allDatabaseData: Record<string, any[]> = {}
  let totalRecords = 0

  for (const table of tables) {
    let queryResult: any[] = []
    try {
      if ((prisma as any)[table.modelName]) {
        queryResult = await (prisma as any)[table.modelName].findMany()
      }
    } catch {
      continue
    }
    allDatabaseData[table.name] = queryResult
    totalRecords += Array.isArray(queryResult) ? queryResult.length : 0
  }

  // 2. Sanitize security tokens and password hashes
  if (allDatabaseData.users) {
    allDatabaseData.users = allDatabaseData.users.map((u) => ({
      ...u,
      password: '[REDACTED_PASSWORD_HASH]',
      resetToken: null,
      resetTokenExpiry: null
    }))
  }

  // 3. Generate Excel workbook in memory
  const excelData: ExcelBackupData = {
    generatedAt: new Date(),
    users: allDatabaseData.users || [],
    items: allDatabaseData.items || [],
    incoming: allDatabaseData.incoming || [],
    outgoing: allDatabaseData.outgoing || [],
    workers: allDatabaseData.workers || [],
    production: allDatabaseData.production || [],
    departments: allDatabaseData.departments || [],
    settings: allDatabaseData.settings || [],
    auditLogs: allDatabaseData['audit-logs'] || []
  }

  const excelBuffer = await generateERPExcelReport(excelData)

  // 4. Create Audit Log
  await createAuditLog(
    user.id,
    user.name,
    user.role,
    'excel_backup_download',
    'backup',
    null,
    `Downloaded direct Excel ERP backup (${totalRecords} total database records)`
  )

  // 5. Send file download response directly to browser
  const today = new Date().toISOString().split('T')[0]
  const fileName = `Mira_Creation_ERP_Backup_${today}.xlsx`

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.send(excelBuffer)
}))

// POST /api/backup/run (Backwards compatibility fallback)
router.post('/run', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!

  await createAuditLog(
    user.id,
    user.name,
    user.role,
    'excel_backup_download',
    'backup',
    null,
    'Manual backup initiated by admin'
  )

  res.json({
    status: 'success',
    message: 'Please use GET /api/backup/excel for direct Excel download.'
  })
}))

// GET /api/backup/status
router.get('/status', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const latestLog = await (prisma as any).auditLog.findFirst({
    where: { action: 'excel_backup_download' },
    orderBy: { createdAt: 'desc' }
  })
  res.json({
    latestLog: latestLog ? {
      completedAt: latestLog.createdAt,
      status: 'success',
      type: 'manual',
      recordCount: 0
    } : null
  })
}))

export default router
