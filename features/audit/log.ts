import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  businessId: string;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  module: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

type ProductHistoryInput = {
  businessId: string;
  branchId?: string | null;
  productId: string;
  userId?: string | null;
  type: string;
  beforeValue?: Prisma.InputJsonValue;
  afterValue?: Prisma.InputJsonValue;
  note?: string | null;
};

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function writeAuditLog(input: AuditInput, client: TxClient = prisma) {
  await client.auditLog.create({
    data: {
      businessId: input.businessId,
      branchId: input.branchId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      module: input.module,
      ipAddress: input.ipAddress ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function writeProductHistory(input: ProductHistoryInput, client: TxClient = prisma) {
  await client.productHistory.create({
    data: {
      businessId: input.businessId,
      branchId: input.branchId ?? null,
      productId: input.productId,
      userId: input.userId ?? null,
      type: input.type,
      beforeValue: input.beforeValue ?? undefined,
      afterValue: input.afterValue ?? undefined,
      note: input.note ?? null,
    },
  });
}
