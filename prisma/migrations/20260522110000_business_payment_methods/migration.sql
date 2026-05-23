CREATE TYPE "PublicPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'AWAITING_PAYMENT');

CREATE TYPE "BusinessPaymentMethodType" AS ENUM (
  'CASH',
  'MOBILE_PAYMENT',
  'TRANSFER',
  'ZELLE',
  'BINANCE',
  'MERCADO_PAGO',
  'CARD'
);

ALTER TABLE "PublicOrder"
ADD COLUMN "paymentStatus" "PublicPaymentStatus" NOT NULL DEFAULT 'PENDING';

CREATE TABLE "BusinessPaymentMethod" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "BusinessPaymentMethodType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "alias" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "qrImage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessPaymentMethod_businessId_type_key" ON "BusinessPaymentMethod"("businessId", "type");
CREATE INDEX "BusinessPaymentMethod_businessId_idx" ON "BusinessPaymentMethod"("businessId");
CREATE INDEX "BusinessPaymentMethod_businessId_enabled_idx" ON "BusinessPaymentMethod"("businessId", "enabled");

ALTER TABLE "BusinessPaymentMethod"
ADD CONSTRAINT "BusinessPaymentMethod_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
