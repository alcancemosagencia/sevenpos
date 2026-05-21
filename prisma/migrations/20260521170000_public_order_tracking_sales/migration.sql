ALTER TYPE "PublicOrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';

ALTER TABLE "PublicOrder"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT,
  ADD COLUMN IF NOT EXISTS "saleId" TEXT;

CREATE INDEX IF NOT EXISTS "PublicOrder_businessId_branchId_idx" ON "PublicOrder"("businessId", "branchId");
CREATE INDEX IF NOT EXISTS "PublicOrder_saleId_idx" ON "PublicOrder"("saleId");
