import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteSale } from '../../../src/application/sales/CompleteSale';
import { InMemorySaleRepository } from '../../../src/infrastructure/repositories/InMemorySaleRepository';
import { InMemoryPaymentMethodRepository } from '../../../src/infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryProductRepository } from '../../../src/infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../src/infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryInventoryMovementRepository } from '../../../src/infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../src/infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryBusinessRepository } from '../../../src/infrastructure/repositories/InMemoryBusinessRepository';
import { Product } from '../../../src/domain/catalog/Product';
import { ProductPresentation } from '../../../src/domain/catalog/ProductPresentation';

describe('CompleteSale — Atomic POS Sales Transaction (AG-06 Core)', () => {
  const businessId = 'biz_01';
  const userId = 'user_01';

  let saleRepo: InMemorySaleRepository;
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let productRepo: InMemoryProductRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let businessRepo: InMemoryBusinessRepository;
  let completeSale: CompleteSale;

  let testProduct: Product;
  let testPackPresentation: ProductPresentation;
  let cashMethodId: string;
  let debitMethodId: string;

  beforeEach(async () => {
    movementRepo = new InMemoryInventoryMovementRepository();
    lotRepo = new InMemoryInventoryLotRepository(movementRepo);
    saleRepo = new InMemorySaleRepository(movementRepo);
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    productRepo = new InMemoryProductRepository();
    presentationRepo = new InMemoryProductPresentationRepository();
    businessRepo = new InMemoryBusinessRepository();

    // Create Business with settings
    await businessRepo.saveBusinessWithSettings(
      {
        id: businessId,
        name: 'Minimarket Don Pepe',
        country: 'CL',
        currency: 'CLP',
        fiscalId: '76.123.456-7',
        address: 'Av. Providencia 1234',
        phone: '+56 9 1234 5678',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
      {
        businessId,
        primaryCurrency: 'CLP',
        taxRate: 0,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      }
    );

    // Seed Payment Methods
    await paymentMethodRepo.ensureDefaultMethods(businessId);
    const methods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    cashMethodId = methods.find((m) => m.code === 'CASH')!.id;
    debitMethodId = methods.find((m) => m.code === 'DEBIT_CARD')!.id;

    // Create Base Product: Coca-Cola 350ml (Stock = 24 UNIT = 24000 scaled)
    testProduct = {
      id: 'prod_coke',
      businessId,
      name: 'Coca-Cola Original 350ml',
      baseUnit: 'UNIT',
      salePrice: 1000,
      costPrice: 600,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    await productRepo.save(testProduct);

    // Create Presentation: Pack x6 (unitFactor = 6, salePrice = 5500)
    testPackPresentation = {
      id: 'pres_pack6',
      businessId,
      productId: testProduct.id,
      name: 'Pack x6',
      unitFactor: 6,
      salePrice: 5500,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    await presentationRepo.save(testPackPresentation);

    // Add Initial Stock: 24 units of Coca-Cola (no lot)
    await movementRepo.recordMovement({
      id: 'mov_init_1',
      businessId,
      productId: testProduct.id,
      movementType: 'ENTRY',
      quantityDelta: 24000, // 24 units
      unitCost: 600,
      totalCost: 14400,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });

    completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo
    );
  });

  it('completes basic unit sale, deducts stock, and generates receipt DTO', async () => {
    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_01',
      items: [
        {
          productId: testProduct.id,
          quantity: 2000, // 2 units
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 2000,
          receivedAmount: 5000,
          changeAmount: 3000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.saleNumber).toBe('V-000001');
    expect(result.saleWithDetails?.sale.total).toBe(2000);
    expect(result.saleWithDetails?.items).toHaveLength(1);
    expect(result.saleWithDetails?.items[0].inventoryQuantityDelta).toBe(-2000);

    // Verify Inventory Ledger Deduction
    const currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(22000); // 24 - 2 = 22 units remaining

    // Verify Receipt DTO
    expect(result.receipt?.businessName).toBe('Minimarket Don Pepe');
    expect(result.receipt?.saleNumber).toBe('V-000001');
    expect(result.receipt?.totalFormatted).toBe('$ 2.000');
    expect(result.receipt?.payments[0].changeFormatted).toBe('$ 3.000');
  });

  it('completes presentation sale (Pack x6) deducting correct multiplier in base units', async () => {
    // Sell 2 Packs x6:
    // Quantity in cart = 2000 (2 packs)
    // Unit price = 5500
    // Factor = 6
    // Inventory deduction = -(2000 * 6) = -12000 base units (12 bottles)
    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_pack_sale',
      items: [
        {
          productId: testProduct.id,
          presentationId: testPackPresentation.id,
          quantity: 2000, // 2 packs
          expectedUnitPrice: 5500,
        },
      ],
      payments: [
        {
          paymentMethodId: debitMethodId,
          amount: 11000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.total).toBe(11000);
    expect(result.saleWithDetails?.items[0].inventoryQuantityDelta).toBe(-12000);

    // Stock was 24, now should be 12 (12000 scaled)
    const currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(12000);
  });

  it('performs multi-lot FEFO deduction correctly', async () => {
    // Add product with lots:
    // Sin lote = 2 units (2000)
    // Lote A (vence 2026-09-10) = 5 units (5000)
    // Lote B (vence 2026-10-15) = 10 units (10000)
    const milkProd: Product = {
      id: 'prod_milk',
      businessId,
      name: 'Leche Entera 1L',
      baseUnit: 'UNIT',
      salePrice: 1200,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    await productRepo.save(milkProd);

    // Create lots
    const lotA = await lotRepo.createLot({
      businessId,
      productId: milkProd.id,
      lotCode: 'LOT-A',
      expirationDate: '2026-09-10',
    });
    const lotB = await lotRepo.createLot({
      businessId,
      productId: milkProd.id,
      lotCode: 'LOT-B',
      expirationDate: '2026-10-15',
    });

    // Add inventory:
    // 2000 unallocated
    await movementRepo.recordMovement({
      id: 'mov_m_unall',
      businessId,
      productId: milkProd.id,
      lotId: null,
      movementType: 'ENTRY',
      quantityDelta: 2000,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });
    // 5000 in Lot A
    await movementRepo.recordMovement({
      id: 'mov_m_lota',
      businessId,
      productId: milkProd.id,
      lotId: lotA.id,
      movementType: 'ENTRY',
      quantityDelta: 5000,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });
    // 10000 in Lot B
    await movementRepo.recordMovement({
      id: 'mov_m_lotb',
      businessId,
      productId: milkProd.id,
      lotId: lotB.id,
      movementType: 'ENTRY',
      quantityDelta: 10000,
      createdByUserId: userId,
      occurredAt: '2026-08-05T00:00:00Z',
      createdAt: '2026-08-05T00:00:00Z',
    });

    // Sell 6 units (6000) -> consumes 2000 unallocated + 4000 Lot A
    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_milk_fefo',
      items: [
        {
          productId: milkProd.id,
          quantity: 6000,
          expectedUnitPrice: 1200,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 7200,
          receivedAmount: 10000,
          changeAmount: 2800,
        },
      ],
    });

    expect(result.success).toBe(true);

    // Verify stock summary after sale
    const totalMilkStock = await movementRepo.getCurrentStock(milkProd.id, businessId);
    expect(totalMilkStock).toBe(11000); // 17 - 6 = 11 units
    const lotsWithStock = await lotRepo.listByProductWithStock(milkProd.id, businessId);
    const resLotA = lotsWithStock.find((l) => l.id === lotA.id);
    const resLotB = lotsWithStock.find((l) => l.id === lotB.id);
    expect(resLotA?.currentStock).toBe(1000); // 5 - 4 = 1 unit
    expect(resLotB?.currentStock).toBe(10000); // 10 untouched
  });

  it('rejects sale and executes total rollback on insufficient stock', async () => {
    // Request 30 units when only 24 are in stock
    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_overstock',
      items: [
        {
          productId: testProduct.id,
          quantity: 30000, // 30 units
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 30000,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('INSUFFICIENT_STOCK');
    expect(result.error).toContain('Stock insuficiente');

    // Verify stock remained untouched at 24000
    const currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(24000);
  });

  it('detects price conflicts (PRICE_CHANGED) and returns official updated prices without selling', async () => {
    // Cart expects $1000, but product in DB was updated to $1200
    testProduct.salePrice = 1200;
    await productRepo.save(testProduct);

    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_price_change',
      items: [
        {
          productId: testProduct.id,
          quantity: 1000,
          expectedUnitPrice: 1000, // old price in cart
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 1000,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('PRICE_CHANGED');
    expect(result.updatedPrices?.[0].officialUnitPrice).toBe(1200);

    // Stock must NOT have changed
    const currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(24000);
  });

  it('guarantees idempotency: replaying same idempotencyKey returns existing sale without duplicate deduction', async () => {
    const saleInput = {
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_repeat_key',
      items: [
        {
          productId: testProduct.id,
          quantity: 2000, // 2 units
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 2000,
        },
      ],
    };

    // First attempt
    const firstRes = await completeSale.execute(saleInput);
    expect(firstRes.success).toBe(true);
    expect(firstRes.isIdempotentReplay).toBeUndefined();

    // Stock should be 22
    let currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(22000);

    // Second attempt with exact same key (simulating network timeout retry)
    const secondRes = await completeSale.execute(saleInput);
    expect(secondRes.success).toBe(true);
    expect(secondRes.isIdempotentReplay).toBe(true);
    expect(secondRes.saleWithDetails?.sale.id).toBe(firstRes.saleWithDetails?.sale.id);

    // Stock must STILL be 22 (0 additional movements)
    currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
    expect(currentStock).toBe(22000);
  });

  it('validates multi-payment: exactly matches sale total', async () => {
    // Total = $10.000 (10 units of Coke at $1000)
    // Paid with $6000 Cash + $4000 Debit
    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_multipay',
      items: [
        {
          productId: testProduct.id,
          quantity: 10000, // 10 units
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 6000,
          receivedAmount: 10000,
          changeAmount: 4000,
        },
        {
          paymentMethodId: debitMethodId,
          amount: 4000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.payments).toHaveLength(2);
    expect(result.saleWithDetails?.payments[0].amount).toBe(6000);
    expect(result.saleWithDetails?.payments[0].changeAmount).toBe(4000);
    expect(result.saleWithDetails?.payments[1].amount).toBe(4000);
  });

  it('P0 Regression: Product A (1990) + Product B (1200) with Fixed Discount 160 completes successfully with payment 3030', async () => {
    // Setup Product A and Product B
    const prodA: Product = {
      id: 'prod_a_1990',
      businessId,
      name: 'Aceite Mazeite 1L',
      baseUnit: 'UNIT',
      salePrice: 1990,
      costPrice: 1400,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    const prodB: Product = {
      id: 'prod_b_1200',
      businessId,
      name: 'Coca Cola Lata 350ml',
      baseUnit: 'UNIT',
      salePrice: 1200,
      costPrice: 700,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    await productRepo.save(prodA);
    await productRepo.save(prodB);

    // Initial stock
    await movementRepo.recordMovement({
      id: 'm_init_a',
      businessId,
      productId: prodA.id,
      movementType: 'ENTRY',
      quantityDelta: 10000,
      unitCost: 1400,
      totalCost: 14000,
      reasonCode: null,
      note: 'Init A',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });
    await movementRepo.recordMovement({
      id: 'm_init_b',
      businessId,
      productId: prodB.id,
      movementType: 'ENTRY',
      quantityDelta: 10000,
      unitCost: 700,
      totalCost: 7000,
      reasonCode: null,
      note: 'Init B',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });

    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_regression_3030',
      items: [
        {
          productId: prodA.id,
          quantity: 1000, // 1 unit
          expectedUnitPrice: 1990,
        },
        {
          productId: prodB.id,
          quantity: 1000, // 1 unit
          expectedUnitPrice: 1200,
        },
      ],
      globalDiscount: {
        type: 'FIXED',
        value: 160,
      },
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 3030,
          receivedAmount: 3030,
          changeAmount: 0,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.saleWithDetails?.sale.subtotal).toBe(3190);
    expect(result.saleWithDetails?.sale.discountTotal).toBe(160);
    expect(result.saleWithDetails?.sale.total).toBe(3030);
    expect(result.saleWithDetails?.items).toHaveLength(2);

    // Sum of items line totals must strictly equal sale.total
    const itemsLineTotalSum = result.saleWithDetails!.items.reduce((sum, i) => sum + i.lineTotal, 0);
    expect(itemsLineTotalSum).toBe(3030);

    // Sum of items discounts must strictly equal discountTotal
    const itemsDiscountSum = result.saleWithDetails!.items.reduce((sum, i) => sum + i.discountTotal, 0);
    expect(itemsDiscountSum).toBe(160);
  });

  it('P0 Regression: Percentage discount 5% on 3190 resolves to 160 (HALF_UP) and completes with payment 3030', async () => {
    const prodA: Product = {
      id: 'prod_a_pct',
      businessId,
      name: 'Aceite Mazeite 1L',
      baseUnit: 'UNIT',
      salePrice: 1990,
      costPrice: 1400,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    const prodB: Product = {
      id: 'prod_b_pct',
      businessId,
      name: 'Coca Cola Lata 350ml',
      baseUnit: 'UNIT',
      salePrice: 1200,
      costPrice: 700,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    await productRepo.save(prodA);
    await productRepo.save(prodB);

    await movementRepo.recordMovement({
      id: 'm_pct_a',
      businessId,
      productId: prodA.id,
      movementType: 'ENTRY',
      quantityDelta: 10000,
      unitCost: 1400,
      totalCost: 14000,
      reasonCode: null,
      note: 'Init',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });
    await movementRepo.recordMovement({
      id: 'm_pct_b',
      businessId,
      productId: prodB.id,
      movementType: 'ENTRY',
      quantityDelta: 10000,
      unitCost: 700,
      totalCost: 7000,
      reasonCode: null,
      note: 'Init',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });

    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_pct_5',
      items: [
        {
          productId: prodA.id,
          quantity: 1000,
          expectedUnitPrice: 1990,
        },
        {
          productId: prodB.id,
          quantity: 1000,
          expectedUnitPrice: 1200,
        },
      ],
      globalDiscount: {
        type: 'PERCENTAGE',
        value: 5, // 5%
      },
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 3030,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.subtotal).toBe(3190);
    expect(result.saleWithDetails?.sale.discountTotal).toBe(160);
    expect(result.saleWithDetails?.sale.total).toBe(3030);
  });

  it('P0 Regression: Multipayment + Discount (Subtotal 20000 - Discount 2000 = Total 18000, Cash 8000 + Debit 10000)', async () => {
    // Add 20 units stock for testProduct
    await movementRepo.recordMovement({
      id: 'm_add_20',
      businessId,
      productId: testProduct.id,
      movementType: 'ENTRY',
      quantityDelta: 20000,
      unitCost: 600,
      totalCost: 12000,
      reasonCode: null,
      note: 'Extra stock',
      referenceType: 'MANUAL',
      referenceId: null,
      createdByUserId: userId,
      occurredAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    });

    const result = await completeSale.execute({
      businessId,
      userId,
      userName: 'Juan Cajero',
      idempotencyKey: 'idem_multipay_disc',
      items: [
        {
          productId: testProduct.id,
          quantity: 20000, // 20 units at $1000 = 20000
          expectedUnitPrice: 1000,
        },
      ],
      globalDiscount: {
        type: 'FIXED',
        value: 2000,
      },
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 8000,
          receivedAmount: 10000,
          changeAmount: 2000,
        },
        {
          paymentMethodId: debitMethodId,
          amount: 10000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.subtotal).toBe(20000);
    expect(result.saleWithDetails?.sale.discountTotal).toBe(2000);
    expect(result.saleWithDetails?.sale.total).toBe(18000);
    expect(result.saleWithDetails?.payments).toHaveLength(2);
    expect(result.saleWithDetails?.payments[0].amount).toBe(8000);
    expect(result.saleWithDetails?.payments[0].changeAmount).toBe(2000);
    expect(result.saleWithDetails?.payments[1].amount).toBe(10000);
  });
});
