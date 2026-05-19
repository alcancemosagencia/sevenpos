"use server";

import { revalidatePath } from "next/cache";
import type { BillingPaymentMethod } from "@prisma/client";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { assignBusinessPlan } from "@/features/billing/plan-service";

async function requireSuperAdmin() {
  const tenant = await requireTenantContext();
  if (!can(tenant.currentUser.role, "admin:access")) {
    throw new Error("No autorizado.");
  }
}

function readBusinessId(formData: FormData) {
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string" || !businessId) {
    throw new Error("Negocio invalido.");
  }

  return businessId;
}

export async function activateBusinessAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: "ACTIVE",
      subscriptionStatus: "ACTIVE",
    },
  });

  revalidatePath("/admin");
}

export async function suspendBusinessAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: "SUSPENDED",
      subscriptionStatus: "SUSPENDED",
    },
  });

  revalidatePath("/admin");
}

export async function reactivateBusinessAction(formData: FormData) {
  await activateBusinessAction(formData);
}

export async function renewBusinessAction(formData: FormData) {
  await markPaymentReceivedAction(formData);
}

export async function cancelBusinessAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: "INACTIVE",
      subscriptionStatus: "CANCELLED",
    },
  });

  revalidatePath("/admin");
}

export async function extendTrialAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);
  const days = Math.max(1, Number(formData.get("days") ?? 7));
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { trialEnd: true },
  });

  if (!business) throw new Error("Negocio no encontrado.");

  const base = business.trialEnd > new Date() ? business.trialEnd : new Date();
  const trialEnd = new Date(base);
  trialEnd.setDate(trialEnd.getDate() + days);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      trialEnd,
      nextPaymentAt: trialEnd,
      subscriptionStatus: "TRIAL",
      status: "ACTIVE",
    },
  });

  revalidatePath("/admin");
}

export async function changePlanAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);
  const planId = formData.get("planId");
  if (typeof planId !== "string" || !planId) throw new Error("Plan invalido.");

  await assignBusinessPlan(businessId, planId);

  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/pre-sales");
}

export async function markPaymentReceivedAction(formData: FormData) {
  await requireSuperAdmin();
  const businessId = readBusinessId(formData);
  const method = formData.get("method");
  const allowedMethods = ["PAGO_MOVIL", "ZELLE", "PAYPAL", "BINANCE", "BANK_TRANSFER", "CASH"] as const;

  if (!allowedMethods.some((candidate) => candidate === method)) {
    throw new Error("Método invalido.");
  }

  const billingPaymentMethod = method as BillingPaymentMethod;

  const nextPaymentAt = new Date();
  nextPaymentAt.setDate(nextPaymentAt.getDate() + 30);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: "ACTIVE",
      subscriptionStatus: "ACTIVE",
      lastPaymentAt: new Date(),
      nextPaymentAt,
      billingPaymentMethod,
    },
  });

  revalidatePath("/admin");
}
