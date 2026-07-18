-- ==========================================
-- Mira Creation ERP - Supabase Database Setup
-- ==========================================

-- Drop existing tables if they exist (safe ordering)
DROP TABLE IF EXISTS "ProductionLog" CASCADE;
DROP TABLE IF EXISTS "Worker" CASCADE;
DROP TABLE IF EXISTS "IncomingStock" CASCADE;
DROP TABLE IF EXISTS "OutgoingStock" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "Settings" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Create User Table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "avatar" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create Worker Table
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "salary" DOUBLE PRECISION,
    "joiningDate" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- Create IncomingStock Table
CREATE TABLE "IncomingStock" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "srNo" TEXT,
    "design" TEXT,
    "fabric" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingStock_pkey" PRIMARY KEY ("id")
);

-- Create OutgoingStock Table
CREATE TABLE "OutgoingStock" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "srNo" TEXT,
    "design" TEXT,
    "fabric" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "customer" TEXT,
    "dispatchDate" TEXT,
    "vehicleNumber" TEXT,
    "status" TEXT DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutgoingStock_pkey" PRIMARY KEY ("id")
);

-- Create ProductionLog Table
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "design" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- Create Department Table
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- Create Settings Table
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "displayName" TEXT,
    "businessType" TEXT,
    "logo" TEXT,
    "legalBusinessName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "alternatePhone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "country" TEXT,
    "gstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "financialYearStart" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "adminName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Create Unique Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Worker_workerId_key" ON "Worker"("workerId");
CREATE UNIQUE INDEX "IncomingStock_srNo_key" ON "IncomingStock"("srNo");
CREATE UNIQUE INDEX "OutgoingStock_srNo_key" ON "OutgoingStock"("srNo");
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- Add Foreign Keys
ALTER TABLE "ProductionLog" 
    ADD CONSTRAINT "ProductionLog_workerId_fkey" 
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomingStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutgoingStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;

-- Enable public read and write access for the Express Server backend role
-- (Since Prisma connects with full postgres credentials, it bypasses RLS automatically.
-- We still configure standard policies for full security compliance).
CREATE POLICY "Allow service role full access on User" ON "User" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on Worker" ON "Worker" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on IncomingStock" ON "IncomingStock" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on OutgoingStock" ON "OutgoingStock" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on ProductionLog" ON "ProductionLog" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on Department" ON "Department" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access on Settings" ON "Settings" TO service_role USING (true) WITH CHECK (true);

-- Also add basic authenticated/anon policies for direct Supabase client access:
CREATE POLICY "Allow public read on Settings" ON "Settings" FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on User" ON "User" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on Worker" ON "Worker" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on IncomingStock" ON "IncomingStock" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on OutgoingStock" ON "OutgoingStock" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on ProductionLog" ON "ProductionLog" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on Department" ON "Department" FOR SELECT TO authenticated USING (true);
