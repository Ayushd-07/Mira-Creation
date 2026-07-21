import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { departmentSchema, cleanEmptyStrings } from '../lib/validators.js'
import { createAuditLog } from '../lib/audit.js'
import { syncRecordCreate, syncRecordUpdate, syncRecordDelete } from '../lib/google-sheets-sync.js'

const router = Router()

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const withCounts = await Promise.all(
    departments.map(async (d: any) => ({
      ...d,
      workerCount: await prisma.worker.count({ where: { department: d.name } }),
    }))
  )
  res.json(withCounts)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(departmentSchema.parse(req.body))
  const existing = await prisma.department.findUnique({ where: { name: data.name } })
  if (existing) throw new HttpError(409, 'A department with this name already exists', 'DUPLICATE')
  const dept = await prisma.department.create({ data })

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'department_create', 'departments', dept.id, `Created department ${dept.name}`)
  }

  syncRecordCreate('department', dept)

  res.status(201).json(dept)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = cleanEmptyStrings(departmentSchema.parse(req.body))
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Department not found', 'NOT_FOUND')
  const dept = await prisma.department.update({ where: { id: req.params.id }, data })

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'department_update', 'departments', dept.id, `Updated department ${dept.name}`)
  }

  syncRecordUpdate('department', dept.id, dept)

  res.json(dept)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Department not found', 'NOT_FOUND')
  const count = await prisma.worker.count({ where: { department: existing.name } })
  if (count > 0) throw new HttpError(409, 'Cannot delete department with assigned workers', 'HAS_WORKERS')
  await prisma.department.delete({ where: { id: req.params.id } })

  if (req.user) {
    await createAuditLog(req.user.id, req.user.name, req.user.role, 'department_delete', 'departments', req.params.id, `Deleted department ${existing.name}`)
  }

  syncRecordDelete('department', req.params.id)

  res.json({ message: 'Department deleted successfully' })
}))

export default router