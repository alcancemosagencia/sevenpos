import { PlanCode } from './Plan';

/**
 * SevenPOS canonical subscription statuses.
 * CANCELED is NOT used — cancel intent is expressed via cancel_at_period_end = true on ACTIVE.
 */
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
export type SubscriptionSource = 'LOCAL_FALLBACK' | 'CLOUD';

export type SubscriptionResolutionReason =
  | 'CONFIRMED_PRO'
  | 'CONFIRMED_FREE'
  | 'LOAD_ERROR'
  | 'NO_CLOUD_LINK'
  | 'OFFLINE_UNAVAILABLE'
  | 'INVALID_UUID'
  | 'RLS_DENIED';

export interface Subscription {
  businessId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  resolutionReason?: SubscriptionResolutionReason;
  errorMessage?: string;
  /** ISO 8601 timestamp of last known update */
  updatedAt: string;
  /** True if cancel has been requested; Pro remains until periodEnd */
  cancelAtPeriodEnd?: boolean;
  /** ISO 8601 end of current billing period (if known) */
  periodEnd?: string | null;
  /** Server-owned source; informational only, never used to infer entitlement. */
  billingSource?: string | null;
}

/**
 * Derives the effective entitlement plan from a subscription.
 * ACTIVE or PAST_DUE (within grace) → PRO
 * All others → FREE
 */
export function effectivePlanCode(sub: Subscription): PlanCode {
  if (sub.plan === 'FREE') return 'FREE';
  if (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') return 'PRO';
  return 'FREE';
}
