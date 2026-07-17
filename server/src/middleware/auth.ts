import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    name: string
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' })
    }
    const token = header.split(' ')[1]
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists', code: 'UNAUTHORIZED' })
    }
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' })
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action', code: 'FORBIDDEN' })
    }
    next()
  }
}