import { allowedBillingOrigins } from './billingCors.ts';

/** Keep old clients on APP_URL; new browser clients can return only to their own approved origin. */
export function resolveBillingReturnUrl(
  requestedOrigin: unknown,
  requestOrigin: string | null,
  fallbackAppUrl: string,
): string {
  if (
    typeof requestedOrigin === 'string' &&
    requestOrigin === requestedOrigin &&
    allowedBillingOrigins.some((allowed) => allowed === requestedOrigin)
  ) {
    return `${requestedOrigin}/subscription/return`;
  }

  return `${fallbackAppUrl.replace(/\/$/, '')}/subscription/return`;
}
