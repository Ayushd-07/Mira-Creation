// Vercel serverless function entry point.
// This file is the single backend handler for all /api/* requests on Vercel.
// It re-exports the Express app defined in server/src/app.ts so the same
// codebase runs both locally (server/src/index.ts) and on Vercel (this file).
// Environment variables are injected by Vercel at runtime (and loaded by
// server/src/app.ts via dotenv for local development).
//
// IMPORTANT: The import MUST include the explicit `.ts` extension. Vercel's
// bundler (esbuild) traces this file and resolves the rest of the graph, but
// a bare `../server/src/app` (no extension) fails to resolve to app.ts and
// throws "Cannot find module" at cold start — which made EVERY /api/* request
// return HTTP 500 in production.
import { app } from '../server/src/app.ts'

export default app