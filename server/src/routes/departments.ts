import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authorize, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { departmentSchema } from '../lib/validators.js'

const router = Router()

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const withCounts = await Promise.all(
    departments.map(async (d) => ({
      ...d,
      workerCount: await prisma.worker.count({ where: { department: d.name } }),
    }))
  )
  res.json(withCounts)
}))

router.post('/', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = departmentSchema.parse(req.body)
  const existing = await prisma.department.findUnique({ where: { name: data.name } })
  if (existing) throw new HttpError(409, 'A department with this name already exists', 'DUPLICATE')
  const dept = await prisma.department.create({ data })
  res.status(201).json(dept)
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const data = departmentSchema.parse(req.body)
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Department not found', 'NOT_FOUND')
  const dept = await prisma.department.update({ where: { id: req.params.id }, data })
  res.json(dept)
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } })
  if (!existing) throw new HttpError(404, 'Department not found', 'NOT_FOUND')
  const count = await prisma.worker.count({ where: { department: existing.name } })
  if (count > 0) throw new HttpError(409, 'Cannot delete department with assigned workers', 'HAS_WORKERS')
  await prisma.department.delete({ where: { id: req.params.id } })
  res.json({ message: 'Department deleted successfully' })
}))

export default router