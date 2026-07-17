// Vercel serverless function entry point.
// This file is the single backend handler for all /api/* requests on Vercel.
// It re-exports the Express app defined in server/src/app.ts so the same
// codebase runs both locally (server/src/index.ts) and on Vercel (this file).
// Environment variables are injected by Vercel at runtime (and loaded by
// server/src/app.ts via dotenv for local development).
import { app } from '../server/src/app'

export default app
