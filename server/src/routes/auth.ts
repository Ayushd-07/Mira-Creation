import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/validators.js'
import { createAuditLog } from '../lib/audit.js'
const router = Router()

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10

function hashLoginKey(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

async function assertLoginAllowed(req: Request, email: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const emailHash = hashLoginKey(email)
  const ipHash = hashLoginKey(getClientIp(req))
  const attempts = await (prisma as any).auditLog.count({
    where: {
      action: 'login_failure',
      module: 'auth',
      createdAt: { gte: since },
      OR: [
        { details: { contains: `emailHash=${emailHash}` } },
        { details: { contains: `ipHash=${ipHash}` } },
      ],
    },
  })

  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many login attempts. Please try again after 15 minutes.', 'TOO_MANY_REQUESTS')
  }

  return { emailHash, ipHash }
}

async function auditLoginFailure(emailHash: string, ipHash: string, user?: { id: string; name: string; role: string } | null) {
  await createAuditLog(
    user?.id || null,
    user?.name || 'Unknown User',
    user?.role || 'unknown',
    'login_failure',
    'auth',
    user?.id || null,
    `Invalid login attempt emailHash=${emailHash} ipHash=${ipHash}`
  )
}

const z_changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

function publicUser(u: { id: string; email: string; name: string; role: string; avatar?: string | null }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatar: u.avatar ?? undefined }
}

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body)
  const { emailHash, ipHash } = await assertLoginAllowed(req, email)
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    await auditLoginFailure(emailHash, ipHash)
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }
  if (user.role !== 'admin' && user.role !== 'manager') {
    await auditLoginFailure(emailHash, ipHash, user)
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    await auditLoginFailure(emailHash, ipHash, user)
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role })

  await createAuditLog(user.id, user.name, user.role, 'login_success', 'auth', user.id, 'User logged in successfully')

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

  if (user) {
    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 3600_000) } })
    await createAuditLog(user.id, user.name, user.role, 'forgot_password_request', 'auth', user.id, 'Password reset requested')
  } else {
    await createAuditLog(null, 'Unknown User', 'unknown', 'forgot_password_request_failed', 'auth', null, `Password reset requested for unknown emailHash=${hashLoginKey(email)}`)
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

  await createAuditLog(user.id, user.name, user.role, 'reset_password_success', 'auth', user.id, 'Password reset via token completed')

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

  await createAuditLog(user.id, user.name, user.role, 'change_password_success', 'auth', user.id, 'Password changed successfully')

  res.json({ message: 'Password updated successfully.' })
}))

export default router