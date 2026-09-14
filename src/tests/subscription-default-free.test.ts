import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { PLAN_DEFINITIONS } from '../domain/subscription/Plan';

describe('Subscription - Default FREE Plan', () => {
  let subRepo: InMemorySubscriptionRepository;
  let entitlementService: EntitlementService;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    entitlementService = new EntitlementService(subRepo);
  });

  it('defaults any tenant/business to ACTIVE FREE subscription when no record exists', async () => {
    const sub = await subRepo.getSubscription('biz-new-tenant');
    expect(sub).toBeDefined();
    expect(sub.plan).toBe('FREE');
    expect(sub.status).toBe('ACTIVE');
  });

  it('correctly returns FREE plan limits and entitlements', async () => {
    const plan = await entitlementService.getPlan('biz-new-tenant');
    expect(plan.code).toBe('FREE');
    expect(plan.name).toBe('SevenPOS Free');

    // Products limit: 100
    const prodLimit = await entitlementService.getLimit('biz-new-tenant', 'catalog.active_products');
    expect(prodLimit.value).toBe(100);
    expect(prodLimit.enforced).toBe(true);

    // Customers limit: 50
    const custLimit = await entitlementService.getLimit('biz-new-tenant', 'customers.active');
    expect(custLimit.value).toBe(50);
    expect(custLimit.enforced).toBe(true);

    // Users limit: 1
    const userLimit = await entitlementService.getLimit('biz-new-tenant', 'users.active_operators');
    expect(userLimit.value).toBe(1);
    expect(userLimit.enforced).toBe(true);

    // Sales: UNLIMITED
    const salesLimit = await entitlementService.getLimit('biz-new-tenant', 'pos.monthly_sales');
    expect(salesLimit.value).toBe('UNLIMITED');
    expect(salesLimit.enforced).toBe(false);

    // Devices: DISPLAY_ONLY / NOT_ENFORCED
    const deviceLimit = await entitlementService.getLimit('biz-new-tenant', 'devices.registered');
    expect(deviceLimit.enforced).toBe(false);

    // Exports: YES for both XLSX and CSV
    const xlsxEnt = await entitlementService.can('biz-new-tenant', 'export.xlsx');
    expect(xlsxEnt.allowed).toBe(true);
    const csvEnt = await entitlementService.can('biz-new-tenant', 'export.csv');
    expect(csvEnt.allowed).toBe(true);
  });

  it('pro plan definition has unlimited products & customers commercial limits with internal ceilings', () => {
    const proDef = PLAN_DEFINITIONS.PRO;
    expect(proDef.limits.activeProducts).toBe(Infinity);
    expect(proDef.limits.activeCustomers).toBe(Infinity);
    expect(proDef.limits.activeUsers).toBe(5);
  });
});
