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

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details })
  }
  console.error('Unhandled error:', err)
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
}