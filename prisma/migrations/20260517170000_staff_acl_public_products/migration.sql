ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "AccessRole" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AccessPermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserAccessRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccessRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccessRole_businessId_slug_key" ON "AccessRole"("businessId", "slug");
CREATE INDEX IF NOT EXISTS "AccessRole_businessId_idx" ON "AccessRole"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "AccessPermission_roleId_section_action_key" ON "AccessPermission"("roleId", "section", "action");
CREATE INDEX IF NOT EXISTS "AccessPermission_roleId_idx" ON "AccessPermission"("roleId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAccessRole_userId_roleId_key" ON "UserAccessRole"("userId", "roleId");
CREATE INDEX IF NOT EXISTS "UserAccessRole_roleId_idx" ON "UserAccessRole"("roleId");

DO $$
BEGIN
  ALTER TABLE "AccessRole" ADD CONSTRAINT "AccessRole_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AccessPermission" ADD CONSTRAINT "AccessPermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
