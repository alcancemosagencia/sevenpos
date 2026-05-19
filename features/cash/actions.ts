"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { cashMovementSignedAmounts, decimalToNumber } from "@/features/cash/utils";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { writeAuditLog } from "@/features/audit/log";

export type CashActionState = {
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

export async function openCashSessionAction(
  _state: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const tenant = await requireTenantContext();
  const businessId = tenant.businessId;

  if (!businessId) {
    redirect("/onboarding");
  }

  try {
    const openingAmountUsd = readNumber(formData, "openingAmountUsd");
    const openingAmountBs = readNumber(formData, "openingAmountBs");
    const branch = await getCurrentBranchForUser(businessId, tenant.currentUser.id);

    const existingOpen = await prisma.cashSession.findFirst({
      where: { businessId, branchId: branch.id, status: "OPEN" },
      select: { id: true },
    });

    if (existingOpen) {
      redirect("/pos");
    }

    await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          businessId,
          branchId: branch.id,
          openedById: tenant.currentUser.id,
          openingAmountUsd: openingAmountUsd.toString(),
          openingAmountBs: openingAmountBs.toString(),
          expectedUsd: openingAmountUsd.toString(),
          expectedBs: openingAmountBs.toString(),
          status: "OPEN",
        },
      });

      await tx.cashMovement.create({
        data: {
          businessId,
          branchId: branch.id,
          cashSessionId: session.id,
          type: "OPENING",
          amountUsd: openingAmountUsd.toString(),
          amountBs: openingAmountBs.toString(),
          note: "Apertura de caja",
          createdById: tenant.currentUser.id,
        },
      });

      await writeAuditLog(
        {
          businessId,
          branchId: branch.id,
          userId: tenant.currentUser.id,
          action: "CASH_OPENED",
          module: "CASH",
          metadata: { sessionId: session.id, openingAmountUsd, openingAmountBs },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "No pudimos abrir la caja." };
  }

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  redirect("/pos");
}

export async function createQuickExpenseAction(
  _state: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const tenant = await requireTenantContext();
  const businessId = tenant.businessId;

  if (!businessId) {
    return { error: "Negocio no disponible." };
  }

  try {
    const amount = readNumber(formData, "amount");
    const currency = readString(formData, "currency");
    const note = readString(formData, "note") || "Gasto rapido";

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

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos registrar el gasto." };
  }
}

export async function closeCashSessionAction(
  _state: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const tenant = await requireTenantContext();
  const businessId = tenant.businessId;

  if (!businessId) {
    redirect("/onboarding");
  }

  try {
    const closingAmountUsd = readNumber(formData, "closingAmountUsd");
    const closingAmountBs = readNumber(formData, "closingAmountBs");
    const branch = await getCurrentBranchForUser(businessId, tenant.currentUser.id);

    const session = await prisma.cashSession.findFirst({
      where: { businessId, branchId: branch.id, status: "OPEN" },
      include: { movements: true },
    });

    if (!session) {
      redirect("/cash/open");
    }

    const movementTotals = session.movements.reduce(
      (totals, movement) => {
        const signed = cashMovementSignedAmounts(
          movement.type,
          decimalToNumber(movement.amountUsd),
          decimalToNumber(movement.amountBs),
        );
        return {
          usd: totals.usd + signed.usd,
          bs: totals.bs + signed.bs,
        };
      },
      { usd: 0, bs: 0 },
    );

    const expectedUsd = movementTotals.usd;
    const expectedBs = movementTotals.bs;
    const differenceUsd = closingAmountUsd - expectedUsd;
    const differenceBs = closingAmountBs - expectedBs;

    await prisma.$transaction(async (tx) => {
      await tx.cashSession.update({
        where: { id: session.id, businessId },
        data: {
          closedById: tenant.currentUser.id,
          closingAmountUsd: closingAmountUsd.toString(),
          closingAmountBs: closingAmountBs.toString(),
          expectedUsd: expectedUsd.toString(),
          expectedBs: expectedBs.toString(),
          differenceUsd: differenceUsd.toString(),
          differenceBs: differenceBs.toString(),
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      await tx.cashMovement.create({
        data: {
          businessId,
          branchId: branch.id,
          cashSessionId: session.id,
          type: "CLOSING",
          amountUsd: closingAmountUsd.toString(),
          amountBs: closingAmountBs.toString(),
          note: `Cierre de caja. Diferencia USD ${differenceUsd.toFixed(2)} / Bs ${differenceBs.toFixed(2)}`,
          createdById: tenant.currentUser.id,
        },
      });

      await writeAuditLog(
        {
          businessId,
          branchId: branch.id,
          userId: tenant.currentUser.id,
          action: "CASH_CLOSED",
          module: "CASH",
          metadata: { sessionId: session.id, expectedUsd, expectedBs, differenceUsd, differenceBs },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "No pudimos cerrar la caja." };
  }

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
