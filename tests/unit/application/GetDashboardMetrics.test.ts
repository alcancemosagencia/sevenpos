import { describe, it, expect, beforeEach } from 'vitest';
import { GetDashboardMetrics } from '../../../src/application/dashboard/GetDashboardMetrics';
import { InMemorySaleRepository } from '../../../src/infrastructure/repositories/InMemorySaleRepository';
import { InMemoryInventoryMovementRepository } from '../../../src/infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryQueryRepository } from '../../../src/infrastructure/repositories/InMemoryInventoryQueryRepository';
import { InMemoryProductRepository } from '../../../src/infrastructure/repositories/InMemoryProductRepository';
import { InMemoryPaymentMethodRepository } from '../../../src/infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryInventoryLotRepository } from '../../../src/infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryBusinessRepository } from '../../../src/infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryProductPresentationRepository } from '../../../src/infrastructure/repositories/InMemoryProductPresentationRepository';
import { CompleteSale } from '../../../src/application/sales/CompleteSale';
import { salesEventBus } from '../../../src/domain/sales/events/SalesEventBus';

describe('GetDashboardMetrics — Reactive Dashboard Reporting (AG-06.1)', () => {
  const businessId = 'biz_dash_01';
  const userId = 'user_dash_01';

  let saleRepo: InMemorySaleRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let queryRepo: InMemoryInventoryQueryRepository;
  let productRepo: InMemoryProductRepository;
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let businessRepo: InMemoryBusinessRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let completeSale: CompleteSale;
  let getDashboardMetrics: GetDashboardMetrics;
  let cashMethodId: string;

  beforeEach(async () => {
    movementRepo = new InMemoryInventoryMovementRepository();
    lotRepo = new InMemoryInventoryLotRepository(movementRepo);
    saleRepo = new InMemorySaleRepository(movementRepo);
    productRepo = new InMemoryProductRepository();
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    businessRepo = new InMemoryBusinessRepository();
    presentationRepo = new InMemoryProductPresentationRepository();
    queryRepo = new InMemoryInventoryQueryRepository(productRepo, movementRepo, lotRepo);

    completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo
    );

    getDashboardMetrics = new GetDashboardMetrics(saleRepo, queryRepo);

    await paymentMethodRepo.ensureDefaultMethods(businessId);
    const methods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    cashMethodId = methods.find((m) => m.code === 'CASH')!.id;

    // Create 2 products
    await productRepo.save({
      id: 'p1',
      businessId,
      name: 'Aceite Mazeite 1L',
      baseUnit: 'UNIT',
      salePrice: 1990,
      costPrice: 1400,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    });

    await productRepo.save({
      id: 'p2',
      businessId,
      name: 'Coca Cola Lata 350ml',
      baseUnit: 'UNIT',
      salePrice: 1200,
      costPrice: 700,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    });

    // Stock entries
    await movementRepo.recordMovement({
      id: 'm1',
      businessId,
      productId: 'p1',
      movementType: 'ENTRY',
      quantityDelta: 20000,
      unitCost: 1400,
      totalCost: 28000,
      reasonCode: null,
      note: 'Init',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });

    await movementRepo.recordMovement({
      id: 'm2',
      businessId,
      productId: 'p2',
      movementType: 'ENTRY',
      quantityDelta: 20000,
      unitCost: 700,
      totalCost: 14000,
      reasonCode: null,
      note: 'Init',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });
  });

  it('starts at 0 sales and 0 tickets for empty period', async () => {
    const data = await getDashboardMetrics.execute(businessId, 'today');
    expect(data.kpis.todaySales).toBe(0);
    expect(data.kpis.todayTicketsCount).toBe(0);
  });

  it('updates todaySales and todayTicketsCount reactively upon completing sale #1 ($3030)', async () => {
    let notified = false;
    const unsub = salesEventBus.subscribe(() => {
      notified = true;
    });

    const res = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'dash_sale_1',
      items: [
        { productId: 'p1', quantity: 1000, expectedUnitPrice: 1990 },
        { productId: 'p2', quantity: 1000, expectedUnitPrice: 1200 },
      ],
      globalDiscount: { type: 'FIXED', value: 160 },
      payments: [{ paymentMethodId: cashMethodId, amount: 3030 }],
    });

    expect(res.success).toBe(true);
    expect(notified).toBe(true);
    unsub();

    const data = await getDashboardMetrics.execute(businessId, 'today');
    expect(data.kpis.todaySales).toBe(3030);
    expect(data.kpis.todayTicketsCount).toBe(1);
  });

  it('aggregates multiple sales: Sale 1 (3030) + Sale 2 (1970) = Total 5000, 2 Tickets', async () => {
    // Sale 1: 3030
    await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'dash_multi_1',
      items: [
        { productId: 'p1', quantity: 1000, expectedUnitPrice: 1990 },
        { productId: 'p2', quantity: 1000, expectedUnitPrice: 1200 },
      ],
      globalDiscount: { type: 'FIXED', value: 160 },
      payments: [{ paymentMethodId: cashMethodId, amount: 3030 }],
    });

    // Sale 2: 1970 (1 unit of p1 at 1990 with 20 discount = 1970)
    await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'dash_multi_2',
      items: [{ productId: 'p1', quantity: 1000, expectedUnitPrice: 1990 }],
      globalDiscount: { type: 'FIXED', value: 20 },
      payments: [{ paymentMethodId: cashMethodId, amount: 1970 }],
    });

    const data = await getDashboardMetrics.execute(businessId, 'today');
    expect(data.kpis.todaySales).toBe(5000);
    expect(data.kpis.todayTicketsCount).toBe(2);
  });
});
