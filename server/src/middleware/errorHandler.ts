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
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
  }
  if (err instanceof HttpError) {
    // Log expected (handled) HTTP errors at a lower level for traceability.
    console.error(`[${req.method} ${req.originalUrl}] ${err.status} ${err.code}: ${err.message}`)
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details })
  }

  // Unexpected (unhandled) error — log the full stack so it appears in the
  // Vercel Function Logs instead of only a generic "Internal server error".
  const isProd = process.env.NODE_ENV === 'production'
  console.error('[UNHANDLED ERROR]', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  })

  // In production we avoid leaking internals. In non-production we return the
  // full message + stack for fast local iteration.
  const message = err instanceof Error ? err.message : 'Internal server error'
  const body: Record<string, unknown> = {
    error: isProd ? 'Internal server error' : message,
    code: 'INTERNAL_ERROR',
  }
  if (!isProd && err instanceof Error) {
    body.stack = err.stack
  }
  return res.status(500).json(body)
}
