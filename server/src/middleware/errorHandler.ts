import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  status: number
  code?: string
  details?: unknown
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' })
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((e: { path: unknown; message: string }) => ({ 
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path), 
        message: e.message 
      })),
    })
  }
  if (err instanceof HttpError) {
    // Log expected handled errors without request bodies, tokens, or passwords.
    console.warn(`[${req.method} ${req.originalUrl}] ${err.status} ${err.code}: ${err.message}`)
    const body: Record<string, unknown> = { error: err.message, code: err.code }
    if (err.details !== undefined) body.details = err.details
    return res.status(err.status).json(body)
  }

  const isProd = process.env.NODE_ENV === 'production'
  
  if (err && typeof err === 'object') {
    const prismaErr = err as any
    if (prismaErr.code || prismaErr.meta) {
      console.error('[PRISMA ERROR]', {
        code: prismaErr.code,
        meta: prismaErr.meta,
        message: prismaErr.message,
        stack: prismaErr.stack,
      })
    }
  }

  console.error('[UNHANDLED ERROR]', {
    message: err instanceof Error ? err.message : String(err),
    stack: isProd ? undefined : err instanceof Error ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  })

  const body: Record<string, unknown> = {
    error: isProd ? 'Internal server error' : err instanceof Error ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
  }
  if (!isProd && err instanceof Error) {
    body.stack = err.stack
  }
  return res.status(500).json(body)
}
