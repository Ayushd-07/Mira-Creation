# Mira Creation ERP - Vercel Deployment Guide

This project is deployed to Vercel as a **single project** containing both the
Vite React frontend (static) and the Express API (serverless functions).

## Architecture

```
Browser
  │
  ├── /            → static SPA (dist/) served by Vercel, SPA fallback to index.html
  └── /api/*       → serverless function (api/[[catchall]].ts → server/src/app.ts)
                         │
                         ├── PostgreSQL database (Neon / Supabase / etc.)
                         └── Vercel Blob (logo uploads, persistent)
```

- **Frontend**: Vite build output in `dist/`.
- **Backend**: One Express app (`server/src/app.ts`) reused by the local dev
  server (`server/src/index.ts`) and the Vercel serverless function
  (`api/[[catchall]].ts`). No `app.listen()` is used on Vercel.
- **Database**: PostgreSQL only (SQLite is not supported on Vercel's
  ephemeral filesystem).
- **Logos**: Stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is present;
  otherwise written to the local disk (development only).

## Vercel Project Settings

| Setting            | Value                                  |
|--------------------|----------------------------------------|
| Root Directory     | `./` (repository root)                 |
| Build Command      | `npm run vercel-build`                 |
| Output Directory   | `dist`                                 |
| Install Command    | `npm install` (default)                |

`vercel.json` already encodes these, so the Vercel dashboard usually
auto-detects them.

## Required Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**
(and in `server/.env` for local development):

| Variable                 | Example / Notes                                              |
|--------------------------|-------------------------------------------------------------|
| `DATABASE_URL`          | `postgresql://user:pass@host:5432/mira_creation` (required)|
| `JWT_SECRET`            | A long random string, min 32 chars (required)               |
| `JWT_EXPIRES_IN`        | `7d`                                                        |
| `FRONTEND_URL`          | `https://your-app.vercel.app` (used for CORS)              |
| `BLOB_READ_WRITE_TOKEN` | Auto-injected after you create a Vercel Blob store          |
| `NODE_ENV`              | `production` (Vercel sets this automatically)               |

> Never commit real secrets. `.env.example` shows the required keys with
> placeholder values only.

## Database Changes Required Before Deployment

1. The Prisma datasource uses `postgresql`. You **must** provision a hosted
   PostgreSQL database (Neon, Supabase, Railway, AWS RDS, etc.). SQLite is NOT
   supported on Vercel's ephemeral filesystem and the old SQLite migrations
   have been removed.
2. Create the database and set `DATABASE_URL` (see Required Environment
   Variables below).
3. The build command (`npm run vercel-build`) automatically runs
   `prisma migrate deploy` so the tables are created on every production
   deploy. You do NOT need to run migrations manually on Vercel.
4. (Optional, one-time) Seed initial data (admin/manager users, departments,
   sample rows). Run this locally with the production `DATABASE_URL` set, or
   via `npx prisma db seed --schema server/prisma/schema.prisma` after the
   first deploy:
   ```bash
   # Set DATABASE_URL to your hosted Postgres first, then:
   npm --prefix server run seed
   ```
   Default logins after seeding:
   - Admin:  `admin@mira.com` / `admin123`
   - Manager:`manager@mira.com` / `manager123`

## Logo / File Storage

Create a **Blob store** in the Vercel dashboard (Storage → Create → Blob).
Once linked to the project, `BLOB_READ_WRITE_TOKEN` is injected automatically
and all uploaded logos are stored persistently in Blob (surviving redeploys).
No code change is needed — the server detects the token at runtime.

## Local Development

```bash
# 1. Start a local PostgreSQL (or use your own)
docker run --name mira-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
createdb -h localhost -U postgres mira_creation

# 2. Configure environment
cp .env.example server/.env   # then edit DATABASE_URL / JWT_SECRET

# 3. Install + generate client + migrate
npm install
npx prisma generate --schema server/prisma/schema.prisma
npx prisma migrate dev --schema server/prisma/schema.prisma

# 4. Run frontend + backend
npm run dev                 # frontend on :5173 (proxies /api → :4000)
npm --prefix server run dev # backend on :4000
```

## Deploy

```bash
vercel --prod
```

Or connect the Git repository in the Vercel dashboard and push to `main`.