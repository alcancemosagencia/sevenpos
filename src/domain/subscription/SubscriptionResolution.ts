import { PLAN_DEFINITIONS, PlanCode, PlanLimits } from './Plan';
import { Subscription, SubscriptionResolutionReason } from './Subscription';

export type EntitlementState =
  | 'HYDRATING'
  | 'CONFIRMED_PRO'
  | 'CONFIRMED_FREE'
  | 'LOAD_ERROR'
  | 'RLS_DENIED'
  | 'OFFLINE_UNAVAILABLE'
  | 'NO_CLOUD_LINK'
  | 'INVALID_UUID';

export interface ResolvedEntitlement {
  state: EntitlementState;
  businessId: string | null;
  plan: PlanCode | null;
  status: Subscription['status'] | null;
  resolutionReason: SubscriptionResolutionReason | null;
  limits: PlanLimits | null;
  features: readonly string[];
}

export const HYDRATING_ENTITLEMENT: ResolvedEntitlement = {
  state: 'HYDRATING',
  businessId: null,
  plan: null,
  status: null,
  resolutionReason: null,
  limits: null,
  features: [],
};

export function entitlementIdentityKey(userId: string | null, businessId: string | null, reloadKey = ''): string {
  return `${userId ?? ''}:${businessId ?? ''}:${reloadKey}`;
}

export function visibleEntitlement(
  loaded: { key: string; value: ResolvedEntitlement } | null,
  identityKey: string
): ResolvedEntitlement {
  return loaded?.key === identityKey ? loaded.value : HYDRATING_ENTITLEMENT;
}

export function resolveEntitlement(sub: Subscription): ResolvedEntitlement {
  const reason = sub.resolutionReason ?? (sub.plan === 'PRO' ? 'CONFIRMED_PRO' : 'CONFIRMED_FREE');
  const confirmed = reason === 'CONFIRMED_PRO' || reason === 'CONFIRMED_FREE';
  const plan: PlanCode | null = confirmed ? sub.plan : null;
  return {
    state: reason,
    businessId: sub.businessId,
    plan,
    status: confirmed ? sub.status : null,
    resolutionReason: reason,
    limits: plan ? PLAN_DEFINITIONS[plan].limits : null,
    features: plan ? PLAN_DEFINITIONS[plan].entitlements : [],
  };
}

export function isConfirmedEntitlement(sub: Subscription): boolean {
  const reason = sub.resolutionReason;
  return reason === undefined || reason === 'CONFIRMED_PRO' || reason === 'CONFIRMED_FREE';
}

export class EntitlementUnavailableError extends Error {
  constructor(public readonly resolutionReason: SubscriptionResolutionReason | undefined) {
    super('No pudimos verificar el plan de este negocio. Comprueba tu conexión e inténtalo nuevamente.');
    this.name = 'EntitlementUnavailableError';
  }
}
