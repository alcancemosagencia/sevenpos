import { describe, expect, it } from 'vitest';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { entitlementDatePresets } from '../application/subscription/EntitlementDatePresets';
import { HYDRATING_ENTITLEMENT, entitlementIdentityKey, resolveEntitlement, visibleEntitlement } from '../domain/subscription/SubscriptionResolution';
import { Subscription } from '../domain/subscription/Subscription';
import { ISubscriptionRepository } from '../domain/subscription/SubscriptionRepository';

const businessId = 'cb16c3b9-497c-43c8-88c1-7c2c2887e341';
const pro: Subscription = {
  businessId, plan: 'PRO', status: 'ACTIVE', source: 'CLOUD',
  resolutionReason: 'CONFIRMED_PRO', billingSource: 'MERCADO_PAGO', updatedAt: '2026-09-18T02:13:15Z',
};
const free: Subscription = {
  businessId, plan: 'FREE', status: 'ACTIVE', source: 'CLOUD',
  resolutionReason: 'CONFIRMED_FREE', updatedAt: '2026-09-18T02:13:15Z',
};
const loadError: Subscription = {
  ...free, resolutionReason: 'LOAD_ERROR', errorMessage: 'timeout',
};

function gate(scope: 'reports' | 'audit', sub: Subscription, key: string) {
  return entitlementDatePresets(scope, resolveEntitlement(sub)).find((preset) => preset.key === key);
}

describe('AG-ENTITLEMENTS-INCIDENT-03 canonical gates', () => {
  it('A/G: CONFIRMED_PRO allows 30-day Reports from the same resolved plan as /subscription', () => {
    const entitlement = resolveEntitlement(pro);
    expect(entitlement.plan).toBe('PRO');
    expect(entitlement.status).toBe('ACTIVE');
    expect(entitlement.businessId).toBe(businessId);
    expect(entitlementDatePresets('reports', entitlement).find((p) => p.key === 'LAST_30_DAYS')?.locked).toBe(false);
    expect(entitlementDatePresets('reports', entitlement).find((p) => p.key === 'CUSTOM')?.locked).toBe(false);
  });

  it('B/H: CONFIRMED_PRO allows 7-day Audit and keeps the PRO users limit', () => {
    const entitlement = resolveEntitlement(pro);
    expect(entitlementDatePresets('audit', entitlement).find((p) => p.key === 'LAST_7_DAYS')?.locked).toBe(false);
    expect(entitlement.limits?.activeUsers).toBe(5);
    expect(entitlement.features).toContain('audit.full_history');
  });

  it('C/D: confirmed FREE blocks Reports >7 days and Audit >3 days', () => {
    expect(gate('reports', free, 'LAST_7_DAYS')?.locked).toBeUndefined();
    expect(gate('reports', free, 'LAST_30_DAYS')).toMatchObject({ locked: true, badge: 'PRO' });
    expect(gate('audit', free, 'LAST_7_DAYS')).toMatchObject({ locked: true, badge: 'PRO' });
    expect(resolveEntitlement(free).limits).toMatchObject({ reportsHistoryDays: 7, auditHistoryDays: 3, activeUsers: 1 });
  });

  it('E/F: HYDRATING and LOAD_ERROR are not confirmed FREE or upgrade prompts', async () => {
    expect(HYDRATING_ENTITLEMENT.plan).toBeNull();
    const errorEntitlement = resolveEntitlement(loadError);
    expect(errorEntitlement.state).toBe('LOAD_ERROR');
    expect(errorEntitlement.plan).toBeNull();
    expect(entitlementDatePresets('reports', errorEntitlement).find((p) => p.key === 'LAST_30_DAYS')?.badge).toBe('Verificando');
    const repo: ISubscriptionRepository = {
      getSubscription: async () => loadError,
      setPlan: async () => loadError,
    };
    const decision = await new EntitlementService(repo).checkLimit(businessId, 'users.active_operators');
    expect(decision).toMatchObject({ allowed: false, reason: 'ENTITLEMENT_UNAVAILABLE' });
  });

  it('I: account/business switch cannot reuse another identity’s plan', () => {
    const oldKey = entitlementIdentityKey('user-a', businessId);
    const loaded = { key: oldKey, value: resolveEntitlement(pro) };
    expect(visibleEntitlement(loaded, oldKey).plan).toBe('PRO');
    expect(visibleEntitlement(loaded, entitlementIdentityKey('user-b', businessId))).toBe(HYDRATING_ENTITLEMENT);
    expect(visibleEntitlement(loaded, entitlementIdentityKey('user-a', 'other-business'))).toBe(HYDRATING_ENTITLEMENT);
  });

  it('J: refresh has a distinct hydration key and can rehydrate canonical PRO', () => {
    const firstKey = entitlementIdentityKey('user-a', businessId, '0');
    const nextKey = entitlementIdentityKey('user-a', businessId, '1');
    expect(visibleEntitlement({ key: firstKey, value: resolveEntitlement(pro) }, nextKey).state).toBe('HYDRATING');
    expect(visibleEntitlement({ key: nextKey, value: resolveEntitlement(pro) }, nextKey).plan).toBe('PRO');
  });
});
