import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteSale, CompleteSaleInput } from '../CompleteSale';
import { InMemorySaleRepository } from '../../../infrastructure/repositories/InMemorySaleRepository';
import { InMemoryPaymentMethodRepository } from '../../../infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryInventoryMovementRepository } from '../../../infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryBusinessRepository } from '../../../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryCashSessionRepository } from '../../../infrastructure/repositories/InMemoryCashSessionRepository';

describe('CompleteSale — Open Amount Items (Monto Libre)', () => {
  const businessId = 'biz_open_amount_test';
  const userId = 'usr_test';

  let saleRepo: InMemorySaleRepository;
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let productRepo: InMemoryProductRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let businessRepo: InMemoryBusinessRepository;
  let cashSessionRepo: InMemoryCashSessionRepository;
  let completeSale: CompleteSale;

  let cashMethodId: string;

  beforeEach(async () => {
    movementRepo = new InMemoryInventoryMovementRepository();
    cashSessionRepo = new InMemoryCashSessionRepository();
    saleRepo = new InMemorySaleRepository(movementRepo, cashSessionRepo);
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    productRepo = new InMemoryProductRepository();
    presentationRepo = new InMemoryProductPresentationRepository();
    lotRepo = new InMemoryInventoryLotRepository(movementRepo);
    businessRepo = new InMemoryBusinessRepository();

    completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo
    );

    await businessRepo.saveBusinessWithSettings(
      {
        id: businessId,
        name: 'Test Store',
        countryCode: 'CL',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        businessId,
        primaryCurrency: 'CLP',
        secondaryCurrencyEnabled: false,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      }
    );

    await cashSessionRepo.openSession({
      session: {
        id: 'session_1',
        businessId,
        cashRegisterId: 'reg_1',
        openedByUserId: userId,
        openedByNameSnapshot: 'Test Cashier',
        openedAt: new Date().toISOString(),
        openingAmount: 50000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov_open_1',
        businessId,
        cashSessionId: 'session_1',
        cashRegisterId: 'reg_1',
        movementType: 'OPENING',
        amount: 50000,
        currencyCode: 'CLP',
        reason: 'Fondo inicial',
        referenceType: 'SESSION',
        referenceId: 'session_1',
        createdByUserId: userId,
        createdByNameSnapshot: 'Test Cashier',
        createdAt: new Date().toISOString(),
      },
    });

    const methods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    const cashMethod = methods.find((m) => m.code === 'CASH');
    cashMethodId = cashMethod!.id;
  });

  it('completes sale with open amount item and persists custom description without inventory deduction (Adjustment 3)', async () => {
    const input: CompleteSaleInput = {
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_open_amount_1',
      items: [
        {
          productId: null,
          lineType: 'OPEN_AMOUNT',
          customDescription: 'Servicio técnico de PC',
          quantity: 1000,
          expectedUnitPrice: 15000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 15000,
        },
      ],
    };

    const result = await completeSale.execute(input);

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.total).toBe(15000);

    const item = result.saleWithDetails?.items[0];
    expect(item?.lineType).toBe('OPEN_AMOUNT');
    expect(item?.productId).toBeNull();
    expect(item?.productNameSnapshot).toBe('Servicio técnico de PC');
    expect(item?.lineTotal).toBe(15000);
    expect(item?.inventoryQuantityDelta).toBe(0);

    // Verify zero inventory movements created
    const movements = await movementRepo.listByProduct('any', businessId);
    expect(movements.length).toBe(0);

    // Verify receipt formatting
    expect(result.receipt?.items[0].displayName).toBe('Servicio técnico de PC');
    expect(result.receipt?.items[0].lineTotalFormatted).toContain('15.000');
  });

  it('excludes OPEN_AMOUNT lines from top products ranking while including them in total revenue (Adjustment 4)', async () => {
    // 1. Regular product sale
    const regularProduct = {
      id: 'prod_cocacola',
      businessId,
      name: 'Coca Cola 1.5L',
      baseUnit: 'UNIT' as const,
      saleMode: 'UNIT' as const,
      salePrice: 2000,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(regularProduct);
    await movementRepo.recordMovement({
      businessId,
      productId: regularProduct.id,
      movementType: 'OPENING',
      quantityDelta: 10000, // 10 units
      unitCost: 1000,
      totalCost: 10000,
      reasonCode: null,
      note: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    await completeSale.execute({
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_regular_coca',
      items: [
        {
          productId: regularProduct.id,
          quantity: 2000, // 2 units
          expectedUnitPrice: 2000,
        },
      ],
      payments: [{ paymentMethodId: cashMethodId, amount: 4000 }],
    });

    // 2. Open Amount sale ($50.000)
    await completeSale.execute({
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_open_big',
      items: [
        {
          productId: null,
          lineType: 'OPEN_AMOUNT',
          customDescription: 'Instalación de Software',
          quantity: 1000,
          expectedUnitPrice: 50000,
        },
      ],
      payments: [{ paymentMethodId: cashMethodId, amount: 50000 }],
    });

    // Query Top Selling Products from repository
    const topProducts = await saleRepo.getTopSellingProducts(businessId, '2026-09-01T00:00:00Z', '2026-09-30T23:59:59Z');

    // ONLY Coca Cola should be listed in top products! OPEN_AMOUNT must not appear.
    expect(topProducts.length).toBe(1);
    expect(topProducts[0].productId).toBe('prod_cocacola');
    expect(topProducts[0].productName).toBe('Coca Cola 1.5L');
    expect(topProducts[0].totalQuantityMajor).toBe(2);
    expect(topProducts[0].totalRevenue).toBe(4000);

    // But sales period summary includes all sales revenue: $4.000 + $50.000 = $54.000
    const summary = await saleRepo.getSalesSummary(businessId, '2026-09-01T00:00:00Z', '2026-09-30T23:59:59Z');
    expect(summary.totalSales).toBe(54000);
    expect(summary.ticketCount).toBe(2);
  });
});
