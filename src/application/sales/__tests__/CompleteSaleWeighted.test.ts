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
import { Product } from '../../../domain/catalog/Product';

describe('CompleteSale — Weighted Products & FEFO Lot Allocation', () => {
  const businessId = 'biz_weighted_test';
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

  let weightedProduct: Product;
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
        name: 'Test Frutos Secos',
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

    // Seed Cash Session
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

    // Seed Payment Method
    const methods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    const cashMethod = methods.find((m) => m.code === 'CASH');
    cashMethodId = cashMethod!.id;

    // Seed Weighted Product: Almendras $8.990 / kg
    weightedProduct = {
      id: 'prod_almendras',
      businessId,
      name: 'Almendras Tostadas',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 8990, // $8.990 CLP per kg
      costPrice: 5000,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(weightedProduct);
  });

  it('completes weighted sale of 260g at 8.990 CLP/kg with exact total 2.337 CLP', async () => {
    // Initial stock: 1000g
    await movementRepo.recordMovement({
      businessId,
      productId: weightedProduct.id,
      movementType: 'OPENING',
      quantityDelta: 1000,
      unitCost: 5000,
      totalCost: 5000,
      reasonCode: null,
      note: 'Initial stock',
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    const input: CompleteSaleInput = {
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_weight_1',
      items: [
        {
          productId: weightedProduct.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 8990,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 2337,
        },
      ],
    };

    const result = await completeSale.execute(input);

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.total).toBe(2337);
    expect(result.saleWithDetails?.items[0].lineTotal).toBe(2337);
    expect(result.saleWithDetails?.items[0].saleMode).toBe('WEIGHT');
    expect(result.saleWithDetails?.items[0].weightGrams).toBe(260);
    expect(result.saleWithDetails?.items[0].inventoryQuantityDelta).toBe(-260);
    expect(result.saleWithDetails?.items[0].unitCostSnapshot).toBe(5000);
    expect(result.saleWithDetails?.items[0].lineCostTotal).toBe(1300);
    expect(result.saleWithDetails?.items[0].costQualitySnapshot).toBe('REAL');

    const summary = await saleRepo.getSalesSummary(businessId, '2000-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z');
    expect(summary.knownGrossProfit).toBe(1037);

    // Verify remaining stock in grams: 1000 - 260 = 740 g
    const remainingStock = await movementRepo.getCurrentStock(weightedProduct.id, businessId);
    expect(remainingStock).toBe(740);

    // Verify receipt formatting
    expect(result.receipt?.items[0].quantityFormatted).toBe('260 g');
    expect(result.receipt?.items[0].unitPriceFormatted).toContain('8.990');
    expect(result.receipt?.items[0].lineTotalFormatted).toContain('2.337');
  });

  it('snapshots 250 g at 9000 price/kg and 4000 cost/kg as revenue 2250, cost 1000, profit 1250', async () => {
    await productRepo.save({ ...weightedProduct, salePrice: 9000, costPrice: 4000 });
    await movementRepo.recordMovement({
      businessId, productId: weightedProduct.id, movementType: 'OPENING',
      quantityDelta: 1000, unitCost: 4000, totalCost: 4000,
      reasonCode: null, note: 'Costed opening stock', referenceType: null,
      referenceId: null, createdByUserId: userId,
    });
    const result = await completeSale.execute({
      businessId, userId, userName: 'Test Cashier', idempotencyKey: 'weighted-250',
      items: [{ productId: weightedProduct.id, saleMode: 'WEIGHT', weightGrams: 250,
        quantity: 250, expectedUnitPrice: 9000 }],
      payments: [{ paymentMethodId: cashMethodId, amount: 2250 }],
    });
    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.items[0].lineTotal).toBe(2250);
    expect(result.saleWithDetails?.items[0].lineCostTotal).toBe(1000);
    const summary = await saleRepo.getSalesSummary(businessId, '2000-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z');
    expect(summary.knownGrossProfit).toBe(1250);
  });

  it('performs FEFO multi-lot allocation across 2 lots in grams (Adjustment 6)', async () => {
    // Lot A: 100 g, expires earlier (2026-10-01)
    const lotA = await lotRepo.createLot({
      businessId,
      productId: weightedProduct.id,
      lotCode: 'LOTA-100G',
      expirationDate: '2026-10-01',
    });

    // Lot B: 500 g, expires later (2026-12-01)
    const lotB = await lotRepo.createLot({
      businessId,
      productId: weightedProduct.id,
      lotCode: 'LOTB-500G',
      expirationDate: '2026-12-01',
    });

    // Movements to establish stock: 600g total
    await movementRepo.recordMovement({
      businessId,
      productId: weightedProduct.id,
      lotId: lotA.id,
      movementType: 'PURCHASE_RECEIPT',
      quantityDelta: 100,
      unitCost: 5000,
      totalCost: 500,
      reasonCode: null,
      note: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });
    await movementRepo.recordMovement({
      businessId,
      productId: weightedProduct.id,
      lotId: lotB.id,
      movementType: 'PURCHASE_RECEIPT',
      quantityDelta: 500,
      unitCost: 5000,
      totalCost: 2500,
      reasonCode: null,
      note: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    // Sale of 260 g: Expect Lot A (-100g) + Lot B (-160g)
    const input: CompleteSaleInput = {
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_weight_fefo',
      items: [
        {
          productId: weightedProduct.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 8990,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 2337,
        },
      ],
    };

    const result = await completeSale.execute(input);

    expect(result.success).toBe(true);

    // Verify movements created: 2 movements (100g from Lot A, 160g from Lot B)
    const movements = await movementRepo.listByProduct(weightedProduct.id, businessId);
    const saleMovements = movements.filter((m) => m.movementType === 'SALE');
    expect(saleMovements.length).toBe(2);

    const movA = saleMovements.find((m) => m.lotId === lotA.id);
    const movB = saleMovements.find((m) => m.lotId === lotB.id);

    expect(movA?.quantityDelta).toBe(-100);
    expect(movB?.quantityDelta).toBe(-160);

    // Remaining total stock: 600 - 260 = 340 g
    const remainingStock = await movementRepo.getCurrentStock(weightedProduct.id, businessId);
    expect(remainingStock).toBe(340);
  });

  it('blocks sale when requested weight exceeds available stock', async () => {
    // Only 200g in stock
    await movementRepo.recordMovement({
      businessId,
      productId: weightedProduct.id,
      movementType: 'OPENING',
      quantityDelta: 200,
      unitCost: 5000,
      totalCost: 1000,
      reasonCode: null,
      note: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    const input: CompleteSaleInput = {
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_insufficient_weight',
      items: [
        {
          productId: weightedProduct.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 8990,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 2337,
        },
      ],
    };

    const result = await completeSale.execute(input);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('INSUFFICIENT_STOCK');
    expect(result.error).toContain('Stock insuficiente para "Almendras Tostadas"');
    expect(result.error).toContain('disponible 200 g');
    expect(result.error).toContain('requerido 260 g');
  });

  it('allows selling exact available stock and 1 gram', async () => {
    // Stock: 100g
    await movementRepo.recordMovement({
      businessId,
      productId: weightedProduct.id,
      movementType: 'OPENING',
      quantityDelta: 100,
      unitCost: 5000,
      totalCost: 500,
      reasonCode: null,
      note: null,
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    // 1. Sell 1g (8990 * 1 / 1000 = 8.99 -> 9 CLP)
    const res1g = await completeSale.execute({
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_1g',
      items: [
        {
          productId: weightedProduct.id,
          saleMode: 'WEIGHT',
          weightGrams: 1,
          quantity: 1,
          expectedUnitPrice: 8990,
        },
      ],
      payments: [{ paymentMethodId: cashMethodId, amount: 9 }],
    });
    expect(res1g.success).toBe(true);
    expect(res1g.saleWithDetails?.sale.total).toBe(9);

    // Remaining: 99g
    const stockAfter1g = await movementRepo.getCurrentStock(weightedProduct.id, businessId);
    expect(stockAfter1g).toBe(99);

    // 2. Sell exact remaining 99g (8990 * 99 / 1000 = 890.01 -> 890 CLP)
    const resExact = await completeSale.execute({
      businessId,
      userId,
      userName: 'Test Cashier',
      idempotencyKey: 'idem_exact',
      items: [
        {
          productId: weightedProduct.id,
          saleMode: 'WEIGHT',
          weightGrams: 99,
          quantity: 99,
          expectedUnitPrice: 8990,
        },
      ],
      payments: [{ paymentMethodId: cashMethodId, amount: 890 }],
    });
    expect(resExact.success).toBe(true);

    const finalStock = await movementRepo.getCurrentStock(weightedProduct.id, businessId);
    expect(finalStock).toBe(0);
  });
});
