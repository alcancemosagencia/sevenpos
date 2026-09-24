export function isAuthorizedBillingScheduler(
  authorization: string | null,
  cronSecret: string | null,
  expectedCronSecret: string | undefined,
  serviceRoleKey: string,
): boolean {
  return Boolean(
    (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) ||
    authorization === `Bearer ${serviceRoleKey}`
  );
}

export function isActiveManualPro(subscription: {
  billing_source?: string | null;
  plan_code?: string | null;
  status?: string | null;
} | null): boolean {
  return subscription?.billing_source === 'MANUAL' &&
    subscription.plan_code === 'PRO' &&
    subscription.status === 'ACTIVE';
}
