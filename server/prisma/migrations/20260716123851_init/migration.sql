-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IncomingStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "srNo" TEXT,
    "design" TEXT,
    "fabric" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    "total" REAL NOT NULL,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_IncomingStock" ("createdAt", "date", "design", "fabric", "id", "notes", "pieces", "rate", "srNo", "supplier", "total", "updatedAt") SELECT "createdAt", "date", "design", "fabric", "id", "notes", "pieces", "rate", "srNo", "supplier", "total", "updatedAt" FROM "IncomingStock";
DROP TABLE "IncomingStock";
ALTER TABLE "new_IncomingStock" RENAME TO "IncomingStock";
CREATE TABLE "new_OutgoingStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "srNo" TEXT,
    "design" TEXT,
    "fabric" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    "total" REAL NOT NULL,
    "customer" TEXT,
    "dispatchDate" TEXT,
    "vehicleNumber" TEXT,
    "status" TEXT DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OutgoingStock" ("createdAt", "customer", "date", "design", "dispatchDate", "fabric", "id", "notes", "pieces", "rate", "srNo", "status", "total", "updatedAt", "vehicleNumber") SELECT "createdAt", "customer", "date", "design", "dispatchDate", "fabric", "id", "notes", "pieces", "rate", "srNo", "status", "total", "updatedAt", "vehicleNumber" FROM "OutgoingStock";
DROP TABLE "OutgoingStock";
ALTER TABLE "new_OutgoingStock" RENAME TO "OutgoingStock";
CREATE UNIQUE INDEX "OutgoingStock_srNo_key" ON "OutgoingStock"("srNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
