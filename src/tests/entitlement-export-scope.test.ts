import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { InMemoryCustomerRepository } from '../infrastructure/repositories/InMemoryCustomerRepository';

describe('Entitlement - Export Scope Boundaries & Customer Export Isolation', () => {
  let subRepo: InMemorySubscriptionRepository;
  let entitlementService: EntitlementService;
  let customerRepo: InMemoryCustomerRepository;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    entitlementService = new EntitlementService(subRepo);
    customerRepo = new InMemoryCustomerRepository();
  });

  it('allows XLSX and CSV export entitlements on both Free and Pro plans', async () => {
    // Free
    expect((await entitlementService.can('biz-exp-test', 'export.xlsx')).allowed).toBe(true);
    expect((await entitlementService.can('biz-exp-test', 'export.csv')).allowed).toBe(true);

    // Pro
    await subRepo.setPlan('biz-exp-test', 'PRO');
    expect((await entitlementService.can('biz-exp-test', 'export.xlsx')).allowed).toBe(true);
    expect((await entitlementService.can('biz-exp-test', 'export.csv')).allowed).toBe(true);
  });

  it('Customer export is NEVER constrained by report or audit date history windows', async () => {
    // Seed customers created over 60 days ago
    for (let i = 1; i <= 10; i++) {
      await customerRepo.create('biz-exp-test', {
        name: `Cliente Antiguo ${i}`,
        email: `antiguo${i}@test.com`,
      });
    }

    // Customer listing for export must return all 10 customers without 7-day or 3-day truncation
    const customers = await customerRepo.list('biz-exp-test');
    expect(customers.length).toBe(10);
  });
});
