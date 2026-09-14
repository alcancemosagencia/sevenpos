import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySaleRepository } from '../infrastructure/repositories/InMemorySaleRepository';
import { InMemoryProductRepository } from '../infrastructure/repositories/InMemoryProductRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { Sale } from '../domain/sales/Sale';

describe('Entitlement - Free Sales Unlimited & Non-blocking Growth Signal', () => {
  let saleRepo: InMemorySaleRepository;
  let productRepo: InMemoryProductRepository;
  let subRepo: InMemorySubscriptionRepository;
  let usageService: UsageService;
  let entitlementService: EntitlementService;

  beforeEach(() => {
    saleRepo = new InMemorySaleRepository();
    productRepo = new InMemoryProductRepository();
    subRepo = new InMemorySubscriptionRepository();
    usageService = new UsageService(subRepo, { productRepo, saleRepo });
    entitlementService = new EntitlementService(subRepo, usageService);
  });

  it('entitlement limit check for monthly_sales returns UNLIMITED and enforced=false on Free plan', async () => {
    const limit = await entitlementService.getLimit('biz-sales-test', 'pos.monthly_sales');
    expect(limit.value).toBe('UNLIMITED');
    expect(limit.enforced).toBe(false);

    const check = await entitlementService.checkLimit('biz-sales-test', 'pos.monthly_sales');
    expect(check.allowed).toBe(true);
    expect(check.status).toBe('UNLIMITED');
  });

  it('allows completing 300+ sales without any interruption or POS blocking', async () => {
    const nowIso = new Date().toISOString();
    // Seed 300 completed sales
    for (let i = 1; i <= 300; i++) {
      const sale: Sale = {
        id: `sale-${i}`,
        businessId: 'biz-sales-test',
        saleNumber: `TICK-${i}`,
        saleSequence: i,
        status: 'COMPLETED',
        customerNameSnapshot: 'Consumidor final',
        subtotal: 1000,
        discountTotal: 0,
        taxTotal: 190,
        total: 1190,
        currencyCode: 'CLP',
        idempotencyKey: `idem-${i}`,
        createdByUserId: 'usr-cashier',
        createdByNameSnapshot: 'Carlos Cajero',
        createdAt: nowIso,
        completedAt: nowIso,
      };
      await saleRepo.createSaleTransaction(sale, [], [], []);
    }

    const salesCount = await usageService.getMonthlySalesCount('biz-sales-test', 'CL');
    expect(salesCount).toBe(300);

    // Meter recognizes 300+ as milestone reached (growth signal), but never blocking
    const overview = await usageService.getUsageOverview('biz-sales-test');
    expect(overview.salesMilestone.currentMonthlySales).toBe(300);
    expect(overview.salesMilestone.milestoneLevel).toBe('STRONG_RECOMMENDATION');

    // Completing sale #301 succeeds with zero errors
    const sale301: Sale = {
      id: 'sale-301',
      businessId: 'biz-sales-test',
      saleNumber: 'TICK-301',
      saleSequence: 301,
      status: 'COMPLETED',
      customerNameSnapshot: 'Consumidor final',
      subtotal: 2000,
      discountTotal: 0,
      taxTotal: 380,
      total: 2380,
      currencyCode: 'CLP',
      idempotencyKey: 'idem-301',
      createdByUserId: 'usr-cashier',
      createdByNameSnapshot: 'Carlos Cajero',
      createdAt: nowIso,
      completedAt: nowIso,
    };

    const completed = await saleRepo.createSaleTransaction(sale301, [], [], []);
    expect(completed.sale.id).toBe('sale-301');

    const updatedCount = await usageService.getMonthlySalesCount('biz-sales-test', 'CL');
    expect(updatedCount).toBe(301);
  });
});
