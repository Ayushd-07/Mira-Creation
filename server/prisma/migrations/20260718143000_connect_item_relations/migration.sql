-- AlterTable
ALTER TABLE "IncomingStock" ADD COLUMN "itemId" TEXT;

-- AlterTable
ALTER TABLE "OutgoingStock" ADD COLUMN "itemId" TEXT;

-- AddForeignKey
ALTER TABLE "IncomingStock" ADD CONSTRAINT "IncomingStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutgoingStock" ADD CONSTRAINT "OutgoingStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
