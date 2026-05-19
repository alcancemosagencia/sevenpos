CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceMonthly" DECIMAL(12,2) NOT NULL,
    "priceYearly" DECIMAL(12,2) NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxBranches" INTEGER NOT NULL,
    "trialAllowed" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "features" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "planId" TEXT;

CREATE INDEX IF NOT EXISTS "Business_planId_idx" ON "Business"("planId");

ALTER TABLE "Business"
  ADD CONSTRAINT "Business_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "name", "slug", "priceMonthly", "priceYearly", "maxUsers", "maxBranches", "trialAllowed", "status", "features", "updatedAt")
VALUES
  ('plan_starter', 'Starter', 'starter', 19, 190, 3, 1, true, 'ACTIVE', '["POS","inventario","ventas","tickets","menú público","sitio web"]', CURRENT_TIMESTAMP),
  ('plan_business', 'Business', 'business', 49, 490, 10, 3, true, 'ACTIVE', '["POS","inventario","ventas","tickets","menú público","sitio web","reportes","CRM","usuarios","roles","caja avanzada","preventa móvil","exportaciones","soporte prioritario"]', CURRENT_TIMESTAMP),
  ('plan_premium', 'Premium', 'premium', 99, 990, 30, 10, true, 'ACTIVE', '["POS","inventario","ventas","tickets","menú público","sitio web","reportes","analytics avanzados","auditoría","exportaciones","CRM","usuarios","roles","delivery","KDS","marketing","campañas","IA","API","WhatsApp","multi-sucursal","preventa móvil","inventario distribuido","caja avanzada","transferencias","customer display","multi printer","hardware advanced","tracking pedidos","soporte prioritario"]', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "priceYearly" = EXCLUDED."priceYearly",
  "maxUsers" = EXCLUDED."maxUsers",
  "maxBranches" = EXCLUDED."maxBranches",
  "trialAllowed" = EXCLUDED."trialAllowed",
  "status" = EXCLUDED."status",
  "features" = EXCLUDED."features",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Business"
SET "planId" = CASE
  WHEN "plan" IN ('PREMIUM', 'PRO') THEN (SELECT "id" FROM "Plan" WHERE "slug" = 'premium')
  WHEN "plan" IN ('BUSINESS', 'BASIC') THEN (SELECT "id" FROM "Plan" WHERE "slug" = 'business')
  ELSE (SELECT "id" FROM "Plan" WHERE "slug" = 'starter')
END
WHERE "planId" IS NULL;
