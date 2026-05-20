import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { writeAuditLog } from "@/features/audit/log";

export type QuickExpenseResult = {
  error?: string;
  ok?: boolean;
};

function readNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createQuickExpense(formData: FormData): Promise<QuickExpenseResult> {
  const tenant = await requireTenantContext();
  const businessId = tenant.businessId;

  if (!businessId) {
    return { error: "Negocio no disponible." };
  }

  try {
    const amount = readNumber(formData, "amount");
    const currency = readString(formData, "currency");
    const note = readString(formData, "note") || "Gasto rápido";

    if (amount <= 0) {
      return { error: "Ingresa un monto mayor a cero." };
    }

    const branch = await getCurrentBranchForUser(businessId, tenant.currentUser.id);
    const session = await prisma.cashSession.findFirst({
      where: { businessId, branchId: branch.id, status: "OPEN" },
      select: { id: true },
    });

    if (!session) {
      return { error: "No hay caja abierta." };
    }

    await prisma.cashMovement.create({
      data: {
        businessId,
        branchId: branch.id,
        cashSessionId: session.id,
        type: "EXPENSE",
        amountUsd: currency === "USD" ? amount.toString() : "0",
        amountBs: currency === "BS" ? amount.toString() : "0",
        note,
        createdById: tenant.currentUser.id,
      },
    });

    await writeAuditLog({
      businessId,
      branchId: branch.id,
      userId: tenant.currentUser.id,
      action: "CASH_EXPENSE_CREATED",
      module: "CASH",
      metadata: { amount, currency, note },
    });

    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos registrar el gasto." };
  }
}
