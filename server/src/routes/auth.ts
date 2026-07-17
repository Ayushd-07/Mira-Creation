import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/validators.js'

const router = Router()

const z_changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

function publicUser(u: { id: string; email: string; name: string; role: string; avatar?: string | null }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatar: u.avatar ?? undefined }
}

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  if (user.role !== 'admin' && user.role !== 'manager') throw new HttpError(401, 'Invalid role for login', 'INVALID_ROLE')
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  res.json({ token, user: publicUser(user) })
}))

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new HttpError(401, 'User not found', 'UNAUTHORIZED')
  res.json({ user: publicUser(user) })
}))

router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  // Always return success to avoid leaking which emails exist.
  if (user) {
    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 3600_000) } })
  }
  res.json({ message: 'If the email exists, a reset link has been sent.' })
}))

router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body)
  const user = await prisma.user.findFirst({ where: { resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new HttpError(400, 'Invalid or expired reset token', 'INVALID_TOKEN')
  }
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed, resetToken: null, resetTokenExpiry: null } })
  res.json({ message: 'Password has been reset successfully.' })
}))

router.post('/change-password', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = z_changePassword.parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new HttpError(401, 'User not found', 'UNAUTHORIZED')
  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) throw new HttpError(400, 'Current password is incorrect', 'INVALID_PASSWORD')
  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
  res.json({ message: 'Password updated successfully.' })
}))

export default router