# Mira Creation ERP - Vercel Production Deployment Prep

- [x] Inspect complete project structure
- [x] Identify hardcoded URLs, SQLite, local filesystem, serverless gaps
- [x] Refactor Express app into serverless-compatible module (app.ts + api entry)
- [x] Switch Prisma datasource to PostgreSQL (persistent DB)
- [x] Add Vercel Blob persistent storage for logo uploads
- [x] Improve CORS to use env-based origins
- [x] Create correct .env.example (no real secrets)
- [x] Add server deps + prisma generate to root package.json
- [x] Create vercel.json (build, output, SPA rewrite)
- [x] Update DEPLOYMENT.md
- [x] Run npm run build and fix all errors
- [x] Verify deployment readiness & summarize