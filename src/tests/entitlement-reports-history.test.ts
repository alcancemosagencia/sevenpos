import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { DateRange } from '../application/analytics/types';

describe('Entitlement - Reports History Window (7 Days Free vs Full Pro)', () => {
  let subRepo: InMemorySubscriptionRepository;
  let entitlementService: EntitlementService;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    entitlementService = new EntitlementService(subRepo);
  });

  it('constrains a 30-day date range to 7 days on Free plan', async () => {
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

    const result = await entitlementService.getDateRangeConstraint('biz-rep-test', 'reports.history_window', requestedRange);
    expect(result.wasConstrained).toBe(true);
    expect(result.constraintReason).toBe('FREE_PLAN_7_DAYS');
    expect(result.requestedRange).toEqual(requestedRange);

    const effectiveStart = new Date(result.effectiveRange.startDate);
    const effectiveEnd = new Date(result.effectiveRange.endDate);
    const diffDays = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  it('does NOT constrain a 3-day date range on Free plan (already within 7d)', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const requestedRange: DateRange = {
      preset: 'CUSTOM',
      startDate: threeDaysAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      fromUtc: threeDaysAgo.toISOString(),
      toUtc: now.toISOString(),
      label: 'Personalizado',
    };

    const result = await entitlementService.getDateRangeConstraint('biz-rep-test', 'reports.history_window', requestedRange);
    expect(result.wasConstrained).toBe(false);
    expect(result.effectiveRange.startDate).toBe(requestedRange.startDate);
    expect(result.effectiveRange.endDate).toBe(requestedRange.endDate);
  });

  it('does NOT constrain any date range on Pro plan', async () => {
    await subRepo.setPlan('biz-rep-test', 'PRO');

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const requestedRange: DateRange = {
      preset: 'CUSTOM',
      startDate: ninetyDaysAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      fromUtc: ninetyDaysAgo.toISOString(),
      toUtc: now.toISOString(),
      label: 'Personalizado',
    };

    const result = await entitlementService.getDateRangeConstraint('biz-rep-test', 'reports.history_window', requestedRange);
    expect(result.wasConstrained).toBe(false);
    expect(result.effectiveRange.startDate).toBe(requestedRange.startDate);
    expect(result.effectiveRange.endDate).toBe(requestedRange.endDate);
  });
});
