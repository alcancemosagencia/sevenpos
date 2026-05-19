import type { Business, SubscriptionStatus } from "@prisma/client";
import { normalizeCommercialPlan, planPriceUsd } from "@/features/billing/plans";
import { daysUntil, effectiveSubscriptionStatus } from "@/features/billing/utils";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";

export const billingPaymentLabels = {
  PAGO_MOVIL: "Pago móvil",
  ZELLE: "Zelle",
  PAYPAL: "PayPal",
  BINANCE: "Binance",
  BANK_TRANSFER: "Transferencia",
  CASH: "Efectivo",
} as const;

export async function getAdminBusinesses() {
  return prisma.business.findMany({
    include: {
      subscriptionPlan: true,
      users: {
        orderBy: { createdAt: "asc" },
      },
      sales: {
        select: { id: true, total: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function enrichBusiness(business: Awaited<ReturnType<typeof getAdminBusinesses>>[number]) {
  const effectiveStatus = effectiveSubscriptionStatus({
    status: business.subscriptionStatus,
    trialEnd: business.trialEnd,
    nextPaymentAt: business.nextPaymentAt,
  });
  const plan = business.subscriptionPlan?.slug ?? normalizeCommercialPlan(business.plan);
  const owner = business.users.find((user) => user.role === "OWNER") ?? business.users[0] ?? null;
  const salesProcessed = business.sales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);

  return {
    business,
    owner,
    effectiveStatus,
    plan,
    trialDays: daysUntil(business.trialEnd),
    monthlyValue: effectiveStatus === "ACTIVE" ? Number(business.subscriptionPlan?.priceMonthly ?? planPriceUsd(business.plan)) : 0,
    salesProcessed,
  };
}

export type AdminBusiness = Business & {
  users: Array<{ id: string; fullName: string | null; email: string; role: string }>;
};

export function statusClass(status: SubscriptionStatus) {
  if (status === "ACTIVE") return "bg-blue-50 text-blue-700";
  if (status === "TRIAL") return "bg-blue-50 text-blue-700";
  if (status === "PAST_DUE") return "bg-amber-50 text-amber-700";
  if (status === "SUSPENDED") return "bg-red-50 text-red-700";
  return "bg-zinc-100 text-zinc-700";
}

export function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
