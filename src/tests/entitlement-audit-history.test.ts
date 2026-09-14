import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { DateRange } from '../application/analytics/types';

describe('Entitlement - Audit History Window (3 Days Free vs Full Pro) & Immutability', () => {
  let subRepo: InMemorySubscriptionRepository;
  let entitlementService: EntitlementService;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    entitlementService = new EntitlementService(subRepo);
  });

  it('constrains audit query date range beyond 3 days to 3 days on Free plan', async () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    const requestedRange: DateRange = {
      preset: 'CUSTOM',
      startDate: tenDaysAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      fromUtc: tenDaysAgo.toISOString(),
      toUtc: now.toISOString(),
      label: 'Personalizado',
    };

    const result = await entitlementService.getDateRangeConstraint('biz-aud-test', 'audit.history_window', requestedRange);
    expect(result.wasConstrained).toBe(true);
    expect(result.constraintReason).toBe('FREE_PLAN_3_DAYS');

    const effectiveStart = new Date(result.effectiveRange.startDate);
    const effectiveEnd = new Date(result.effectiveRange.endDate);
    const diffDays = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000);
    expect(diffDays).toBeLessThanOrEqual(3);
  });

  it('preserves full audit range on Pro plan', async () => {
    await subRepo.setPlan('biz-aud-test', 'PRO');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const requestedRange: DateRange = {
      preset: 'CUSTOM',
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      fromUtc: thirtyDaysAgo.toISOString(),
      toUtc: now.toISOString(),
      label: 'Personalizado',
    };

    const result = await entitlementService.getDateRangeConstraint('biz-aud-test', 'audit.history_window', requestedRange);
    expect(result.wasConstrained).toBe(false);
    expect(result.effectiveRange).toEqual(requestedRange);
  });
});
