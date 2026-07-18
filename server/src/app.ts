import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import workerRoutes from './routes/workers.js'
import incomingRoutes from './routes/incoming.js'
import outgoingRoutes from './routes/outgoing.js'
import productionRoutes from './routes/production.js'
import departmentRoutes from './routes/departments.js'
import settingsRoutes from './routes/settings.js'
import dashboardRoutes from './routes/dashboard.js'
import exportRoutes from './routes/export.js'
import itemRoutes from './routes/items.js'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const app = express()

// CORS: allow configured frontend origin(s). Same-origin requests (no Origin header)
// are always allowed. FRONTEND_URL may be a comma-separated list for multiple envs.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        /\.vercel\.app$/.test(origin) ||
        (process.env.NODE_ENV !== 'production' &&
          (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)))
      ) {
        cb(null, true)
      } else {
        // Securely log the blocked origin to assist debugging without leaking secrets
        console.warn(`[CORS Blocked] Origin not allowed: ${origin}`)
        cb(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded logos and items from the local filesystem. This is only used as a fallback
// when cloud storage is not configured (i.e. local development).
const uploadsDir = join(process.cwd(), 'uploads', 'logos')
if (!existsSync(uploadsDir)) {
  try {
    mkdirSync(uploadsDir, { recursive: true })
  } catch {
    // Non-fatal on read-only filesystems (e.g. Vercel serverless).
  }
}

const itemsUploadsDir = join(process.cwd(), 'uploads', 'items')
if (!existsSync(itemsUploadsDir)) {
  try {
    mkdirSync(itemsUploadsDir, { recursive: true })
  } catch {
    // Non-fatal
  }
}

app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

app.get('/api/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
)

app.use('/api/auth', authRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/incoming', incomingRoutes)
app.use('/api/outgoing', outgoingRoutes)
app.use('/api/production', productionRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/items', itemRoutes)

app.use(notFound)
app.use(errorHandler)

export { app, prisma }