CREATE TABLE IF NOT EXISTS "BusinessTaxSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ivaRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customTaxName" TEXT,
    "customTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tipsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tipRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tipMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTaxSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessTaxSettings_businessId_key" ON "BusinessTaxSettings"("businessId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BusinessTaxSettings_businessId_fkey'
  ) THEN
    ALTER TABLE "BusinessTaxSettings"
      ADD CONSTRAINT "BusinessTaxSettings_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tipTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
