-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("address", "companyName", "currency", "email", "gstNumber", "id", "language", "logo", "phone", "timezone", "updatedAt") SELECT "address", "companyName", "currency", "email", "gstNumber", "id", "language", "logo", "phone", "timezone", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
