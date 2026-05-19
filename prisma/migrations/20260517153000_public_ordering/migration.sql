DO $$ BEGIN
  CREATE TYPE "PublicOrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BusinessPublicSettings" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "logoUrl" TEXT,
  "rating" DECIMAL(3,2) NOT NULL DEFAULT 4.8,
  "distanceLabel" TEXT NOT NULL DEFAULT '0.8 km',
  "etaLabel" TEXT NOT NULL DEFAULT '25-35 min',
  "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "dineInEnabled" BOOLEAN NOT NULL DEFAULT false,
  "openTime" TEXT NOT NULL DEFAULT '09:00',
  "closeTime" TEXT NOT NULL DEFAULT '21:00',
  "activeDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "termsUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessPublicSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessPublicSettings_businessId_key" ON "BusinessPublicSettings"("businessId");

DO $$ BEGIN
  ALTER TABLE "BusinessPublicSettings" ADD CONSTRAINT "BusinessPublicSettings_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PublicOrder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "PublicOrderStatus" NOT NULL DEFAULT 'NEW',
  "fulfillmentMethod" "FulfillmentMethod" NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "address" TEXT,
  "addressReference" TEXT,
  "lat" DECIMAL(10,7),
  "lng" DECIMAL(10,7),
  "notes" TEXT,
  "paymentMethod" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicOrder_businessId_code_key" ON "PublicOrder"("businessId", "code");
CREATE INDEX IF NOT EXISTS "PublicOrder_businessId_createdAt_idx" ON "PublicOrder"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicOrder_businessId_status_idx" ON "PublicOrder"("businessId", "status");

DO $$ BEGIN
  ALTER TABLE "PublicOrder" ADD CONSTRAINT "PublicOrder_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PublicOrderItem" (
  "id" TEXT NOT NULL,
  "publicOrderId" TEXT NOT NULL,
  "productId" TEXT,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "PublicOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicOrderItem_publicOrderId_idx" ON "PublicOrderItem"("publicOrderId");
CREATE INDEX IF NOT EXISTS "PublicOrderItem_productId_idx" ON "PublicOrderItem"("productId");

DO $$ BEGIN
  ALTER TABLE "PublicOrderItem" ADD CONSTRAINT "PublicOrderItem_publicOrderId_fkey"
    FOREIGN KEY ("publicOrderId") REFERENCES "PublicOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
