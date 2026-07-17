# Production 500 Error Fix - Deployment Guide

## Root Causes Identified and Fixed

### 1. **TypeScript Error in errorHandler.ts** ✅ FIXED
- **Issue**: `err.errors` property access and implicit `any` type for parameter `e`
- **Fix**: Added proper typing for ZodError mapping with explicit type annotation

### 2. **Settings Endpoint Type Mismatch** ✅ FIXED
- **Issue**: `GET /api/settings` was using `AuthRequest` type (requiring authentication) but should be public
- **Fix**: Changed parameter type from `AuthRequest` to `Request` to make it publicly accessible

### 3. **Seed Script Settings ID Issue** ✅ FIXED
- **Issue**: Seed script tried to use hardcoded `id: 'default'` but schema uses auto-generated `cuid()`
- **Fix**: Changed to `findFirst()` pattern to match the route logic

### 4. **Production Database Initialization** ✅ FIXED
- **Issue**: Production database likely missing tables or seed data
- **Fix**: Created `seed-production.ts` script for safe production initialization

## Files Changed

1. `server/src/middleware/errorHandler.ts` - Fixed TypeScript errors
2. `server/src/routes/settings.ts` - Fixed public endpoint type
3. `server/prisma/schema.prisma` - Added Neon SSL comment
4. `server/prisma/seed.ts` - Fixed settings creation logic
5. `server/prisma/seed-production.ts` - **NEW** Production-safe seed script
6. `package.json` - Added seed scripts and tsx dependency

## Pre-Deployment Checklist

### Step 1: Ensure Vercel Environment Variables

In your Vercel project dashboard, verify these environment variables are set:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string (e.g., `postgresql://user:pass@host/db?sslmode=require`)
- `JWT_SECRET` - A long, random secret (min 32 characters)
- `JWT_EXPIRES_IN` - Token expiration (e.g., `7d`)
- `FRONTEND_URL` - Your production frontend URL (e.g., `https://your-app.vercel.app`)

**Optional:**
- `BLOB_READ_WRITE_TOKEN` - For Vercel Blob logo storage (auto-injected when Blob store is created)
- `NODE_ENV` - Automatically set to `production` by Vercel

### Step 2: Deploy Code to Vercel

```bash
# Commit all changes
git add .
git commit -m "fix: resolve production 500 errors for /api/settings and /api/auth/login"
git push origin main
```

Vercel will automatically:
1. Run `npm run vercel-build`
2. Execute Prisma migrations (`prisma migrate deploy`)
3. Build the frontend
4. Deploy the serverless functions

### Step 3: Initialize Production Database

**CRITICAL**: After deployment, you MUST run the seed script to create default users and settings.

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Pull environment variables
vercel pull

# Run seed script with production environment
vercel env pull .env.production
set DATABASE_URL=<your-neon-connection-string>
npx tsx server/prisma/seed-production.ts
```

#### Option B: Direct Database Connection

```bash
# Using your local machine with the Neon connection string
set DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
npx tsx server/prisma/seed-production.ts
```

#### Option C: Using Neon Console

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Run the SQL commands from `server/prisma/migrations/0001_init/migration.sql`
4. Then manually insert the users:

```sql
-- Insert admin user (password: admin123)
INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@mira.com',
  'Admin User',
  '$2a$10$rQ7Hx8qZ8X9Y2Z3A4B5C6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert manager user (password: manager123)
INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'manager@mira.com',
  'Manager User',
  '$2a$10$rQ7Hx8qZ8X9Y2Z3A4B5C6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6',
  'manager',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert default settings
INSERT INTO "Settings" (id, "companyName", email, phone, address, "gstNumber", currency, timezone, language, "updatedAt")
SELECT gen_random_uuid()::text, 'Mira Creation Industrial', 'ops@miracreation.com', '+1 (555) 902-4412', '724 Fabric District, Suite 400, New York, NY 10018', 'GST-0000000000', 'INR', 'Asia/Kolkata', 'en', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Settings" LIMIT 1);
```

**Note**: The password hashes above are examples. Use the seed script to generate correct hashes.

## Verification Steps

### 1. Test Health Endpoint
```bash
curl https://your-app.vercel.app/api/health
```
Expected: `{"status":"ok","time":"..."}`

### 2. Test Settings Endpoint (Public)
```bash
curl https://your-app.vercel.app/api/settings
```
Expected: JSON with company settings (will auto-create if missing)

### 3. Test Login Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mira.com","password":"admin123"}'
```
Expected: JSON with `token` and `user` object

### 4. Test Authenticated Endpoint
```bash
# Use the token from login
curl https://your-app.vercel.app/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
Expected: JSON with user details

## Default Credentials

After running the seed script, these accounts will be available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mira.com | admin123 |
| Manager | manager@mira.com | manager123 |

**⚠️ IMPORTANT**: Change these passwords immediately after first login!

## Vercel Function Logs

If you still encounter 500 errors after deployment:

1. Go to Vercel Dashboard → Your Project → Logs
2. Look for `[UNHANDLED ERROR]` entries
3. The full error stack will be visible in production logs
4. Common issues:
   - `DATABASE_URL` not set or incorrect
   - Database tables don't exist (migrations didn't run)
   - Neon database is paused (wake it up from Neon dashboard)

## Neon PostgreSQL Specific Notes

1. **SSL Required**: Neon requires SSL connections. Ensure your `DATABASE_URL` includes `?sslmode=require`
   - Example: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

2. **Connection Pooling**: Neon provides a connection pooler. For serverless functions, consider using the pooler endpoint:
   - Direct: `ep-xxx.region.aws.neon.tech` (max 100 connections)
   - Pooler: `ep-xxx-pooler.region.aws.neon.tech` (max 10,000 connections)

3. **Database Sleep**: Neon pauses databases after inactivity. First request may take 2-5 seconds to wake up.

4. **Connection Limits**: Vercel serverless functions can scale to hundreds of instances. Use Neon's connection pooler to avoid connection limits.

## Troubleshooting

### Error: "Cannot find module"
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check that migrations ran successfully during build

### Error: "Database connection failed"
- Verify Neon database is not paused
- Check `DATABASE_URL` format includes `?sslmode=require`
- Ensure IP allowlist in Neon includes Vercel IPs (or set to 0.0.0.0/0 for testing)

### Error: "Table does not exist"
- Migrations didn't run. Check Vercel build logs for `prisma migrate deploy` output
- Manually run: `npx prisma migrate deploy --schema server/prisma/schema.prisma`

### Error: "Invalid credentials" on login
- Seed script hasn't been run yet
- Run: `npx tsx server/prisma/seed-production.ts`

## Rollback Plan

If issues persist:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
```

## Success Criteria

✅ `GET /api/health` returns 200 OK
✅ `GET /api/settings` returns 200 OK with settings JSON
✅ `POST /api/auth/login` with admin credentials returns 200 OK with token
✅ `POST /api/auth/login` with manager credentials returns 200 OK with token
✅ Authenticated endpoints work with returned token
✅ No 500 errors in Vercel Function Logs

## Additional Notes

- The build script (`vercel-build`) already runs migrations automatically
- The seed script is **NOT** run during build (to avoid seeding on every deploy)
- Run the seed script **ONCE** after initial deployment
- The seed script is idempotent (safe to run multiple times)