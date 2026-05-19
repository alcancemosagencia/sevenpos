import type { SubscriptionStatus } from "@prisma/client";

export function daysUntil(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function effectiveSubscriptionStatus({
  status,
  trialEnd,
  nextPaymentAt,
}: {
  status: SubscriptionStatus;
  trialEnd: Date;
  nextPaymentAt: Date | null;
}): SubscriptionStatus {
  if (status === "SUSPENDED" || status === "CANCELLED" || status === "PAST_DUE") return status;
  if (status === "TRIAL" && daysUntil(trialEnd) < 0) return "PAST_DUE";
  if (status === "ACTIVE" && nextPaymentAt && daysUntil(nextPaymentAt) < 0) return "PAST_DUE";

  return status;
}

export function subscriptionBadge(status: SubscriptionStatus, daysRemaining: number) {
  if (status === "TRIAL" && daysRemaining <= 3) return "Vence en 3 días";
  if (status === "TRIAL" && daysRemaining <= 7) return "Vence en 7 días";
  if (status === "PAST_DUE") return "Vencido";
  if (status === "SUSPENDED") return "Suspendido";
  if (status === "CANCELLED") return "Cancelado";

  return "OK";
}

export function isSubscriptionBlocked(status: SubscriptionStatus) {
  return status === "PAST_DUE" || status === "SUSPENDED" || status === "CANCELLED";
}
