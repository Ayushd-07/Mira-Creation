import jwt from 'jsonwebtoken'

const DEV_JWT_SECRET = 'mira-creation-development-only-jwt-secret'
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be configured with a strong secret key in production environment.')
  }
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}