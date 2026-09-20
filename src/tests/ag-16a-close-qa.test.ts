import { describe, it, expect, beforeEach } from 'vitest';
import { Product } from '../domain/catalog/Product';
import {
  calculateWeightedLineTotal,
  formatWeightDisplay,
  parseWeightInputToGrams,
} from '../domain/sales/WeightedMath';
import { CompleteSale } from '../application/sales/CompleteSale';
import { InMemorySaleRepository } from '../infrastructure/repositories/InMemorySaleRepository';
import { InMemoryPaymentMethodRepository } from '../infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryProductRepository } from '../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryInventoryMovementRepository } from '../infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryCashSessionRepository } from '../infrastructure/repositories/InMemoryCashSessionRepository';
import { buildReceiptDTO } from '../domain/sales/Receipt';

describe('AG-16A-CLOSE: Full QA & Domain Smoke Verification', () => {
  const businessId = 'biz_qa_close';
  const userId = 'usr_qa';

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
        name: 'Don Pepe Minimarket',
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
        id: 'session_qa',
        businessId,
        cashRegisterId: 'reg_1',
        openedByUserId: userId,
        openedByNameSnapshot: 'Don Pepe',
        openedAt: '2026-09-01T08:00:00Z',
        openingAmount: 50000,
        status: 'OPEN',
        createdAt: '2026-09-01T08:00:00Z',
        updatedAt: '2026-09-01T08:00:00Z',
      },
      initialMovement: {
        id: 'mov_init_qa',
        businessId,
        cashSessionId: 'session_qa',
        cashRegisterId: 'reg_1',
        movementType: 'OPENING',
        amount: 50000,
        currencyCode: 'CLP',
        reason: 'Apertura de caja',
        note: null,
        referenceType: 'SESSION',
        referenceId: 'session_qa',
        createdByUserId: userId,
        createdByNameSnapshot: 'Don Pepe',
        createdAt: '2026-09-01T08:00:00Z',
      },
    });

    await paymentMethodRepo.ensureDefaultMethods(businessId);
    const cash = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    cashMethodId = cash!.id;
  });

  // =========================================================================
  // 1. DOMAIN CONTRACT AUDIT
  // =========================================================================
  it('1. Domain Contract Audit: Normalizes saleMode for legacy and new products', async () => {
    // Legacy product with undefined saleMode in raw data
    const rawLegacyProduct = {
      id: 'prod_legacy',
      businessId,
      name: 'Arroz Clásico 1kg',
      baseUnit: 'UNIT',
      salePrice: 1200,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    } as unknown as Product;
    await productRepo.save(rawLegacyProduct);
    const fetchedLegacy = await productRepo.getById('prod_legacy', businessId);
    expect(fetchedLegacy?.saleMode).toBe('UNIT');

    // New weighted product
    const weightedProduct: Product = {
      id: 'prod_almendras',
      businessId,
      name: 'Almendras',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 8990,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(weightedProduct);
    const fetchedWeighted = await productRepo.getById('prod_almendras', businessId);
    expect(fetchedWeighted?.saleMode).toBe('WEIGHT');
  });

  // =========================================================================
  // 3 & 4. WEIGHTED DOMAIN SMOKE & KG DECIMAL PARSING
  // =========================================================================
  it('3 & 4. Weighted Domain Smoke: 260g @ 8.990 = $2.337, stock 2.500g -> 2.240g (2,24 kg)', async () => {
    const almendras: Product = {
      id: 'prod_almendras_smoke',
      businessId,
      name: 'Almendras',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 8990,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(almendras);

    // Initial stock: 2.5 kg = 2500 grams
    await movementRepo.recordMovement({
      businessId,
      productId: almendras.id,
      movementType: 'OPENING',
      quantityDelta: 2500,
      unitCost: 5000,
      totalCost: 12500,
      reasonCode: null,
      note: 'Initial 2.5kg',
      referenceType: null,
      referenceId: null,
      createdByUserId: userId,
    });

    // Verify decimal parsing:
    expect(parseWeightInputToGrams('0,26', 'KG')).toBe(260);
    expect(parseWeightInputToGrams('0.26', 'KG')).toBe(260);
    expect(parseWeightInputToGrams('1,5', 'KG')).toBe(1500);
    expect(parseWeightInputToGrams('1.5', 'KG')).toBe(1500);
    expect(parseWeightInputToGrams('0,001', 'KG')).toBe(1);

    // Line total math: round((8990 * 260) / 1000) = round(2337.4) = 2337
    const calculated = calculateWeightedLineTotal(almendras.salePrice, 260);
    expect(calculated).toBe(2337);

    // Complete sale of 260g
    const res = await completeSale.execute({
      businessId,
      userId,
      userName: 'Don Pepe',
      idempotencyKey: 'idem_weighted_smoke',
      items: [
        {
          productId: almendras.id,
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
    });

    expect(res.success).toBe(true);
    expect(res.saleWithDetails?.sale.total).toBe(2337);
    expect(res.receipt?.items[0].displayName).toBe('Almendras');
    expect(res.receipt?.items[0].quantityFormatted).toBe('260 g');
    expect(res.receipt?.items[0].unitPriceFormatted).toBe('$ 8.990/kg');

    // Expected remaining stock: 2500 - 260 = 2240 grams
    const remainingStock = await movementRepo.getCurrentStock(almendras.id, businessId);
    expect(remainingStock).toBe(2240);
    expect(formatWeightDisplay(remainingStock)).toBe('2,24 kg');
  });

  // =========================================================================
  // 5. FEFO VALIDATION
  // =========================================================================
  it('5. FEFO Lot Allocation: Lot A (100g, earlier) + Lot B (500g, later) -> Sell 260g -> Lot A:0g, Lot B:340g', async () => {
    const product: Product = {
      id: 'prod_fefo_test',
      businessId,
      name: 'Nueces',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 12000,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(product);

    // Create Lot A: 100g expires 2026-10-01
    const lotA = await lotRepo.createLot({
      businessId,
      productId: product.id,
      lotCode: 'LOT-A',
      expirationDate: '2026-10-01T00:00:00Z',
    });

    // Create Lot B: 500g expires 2026-12-01
    const lotB = await lotRepo.createLot({
      businessId,
      productId: product.id,
      lotCode: 'LOT-B',
      expirationDate: '2026-12-01T00:00:00Z',
    });

    // Record stock movements in movements ledger (total 600g)
    await movementRepo.recordMovement({
      businessId,
      productId: product.id,
      movementType: 'OPENING',
      quantityDelta: 100,
      unitCost: 6000,
      totalCost: 600,
      lotId: lotA.id,
      createdByUserId: userId,
    });
    await movementRepo.recordMovement({
      businessId,
      productId: product.id,
      movementType: 'OPENING',
      quantityDelta: 500,
      unitCost: 6000,
      totalCost: 3000,
      lotId: lotB.id,
      createdByUserId: userId,
    });

    // Sell 260g @ 12.000 = $3.120
    const res = await completeSale.execute({
      businessId,
      userId,
      userName: 'Don Pepe',
      idempotencyKey: 'idem_fefo_260',
      items: [
        {
          productId: product.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 12000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 3120,
        },
      ],
    });

    expect(res.success).toBe(true);

    // Check Lots after sale via movementRepo ledger:
    const stockLotA = await movementRepo.getLotStock(lotA.id, businessId);
    const stockLotB = await movementRepo.getLotStock(lotB.id, businessId);

    expect(stockLotA).toBe(0);
    expect(stockLotB).toBe(340);

    const totalStock = await movementRepo.getCurrentStock(product.id, businessId);
    expect(totalStock).toBe(340);
  });

  // =========================================================================
  // 6. INSUFFICIENT STOCK
  // =========================================================================
  it('6. Insufficient Stock: Blocks sale when 200g available and 260g requested without mutating inventory', async () => {
    const product: Product = {
      id: 'prod_stock_guard',
      businessId,
      name: 'Pasas Morenas',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 4500,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(product);

    await movementRepo.recordMovement({
      businessId,
      productId: product.id,
      movementType: 'OPENING',
      quantityDelta: 200, // only 200g
      unitCost: 2000,
      totalCost: 400,
      createdByUserId: userId,
    });

    const res = await completeSale.execute({
      businessId,
      userId,
      userName: 'Don Pepe',
      idempotencyKey: 'idem_guard_insufficient',
      items: [
        {
          productId: product.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 4500,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 1170,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('INSUFFICIENT_STOCK');

    // Zero mutation
    const stockAfter = await movementRepo.getCurrentStock(product.id, businessId);
    expect(stockAfter).toBe(200);

    const allSales = await saleRepo.listSales(businessId);
    expect(allSales.length).toBe(0);
  });

  // =========================================================================
  // 7 & 8. OPEN AMOUNT MANUAL FLOW & RELOAD PERSISTENCE
  // =========================================================================
  it('7 & 8. Open Amount Flow & Reload Persistence: $5.000 Servicio técnico persists description & 0 inventory', async () => {
    const res = await completeSale.execute({
      businessId,
      userId,
      userName: 'Don Pepe',
      idempotencyKey: 'idem_open_amount_svc',
      items: [
        {
          productId: null,
          lineType: 'OPEN_AMOUNT',
          customDescription: 'Servicio técnico',
          quantity: 1000,
          expectedUnitPrice: 5000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 5000,
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.saleWithDetails?.sale.total).toBe(5000);
    expect(res.receipt?.items[0].displayName).toBe('Servicio técnico');

    // Verify 0 movements recorded
    const movements = await movementRepo.listMovements({ businessId });
    expect(movements.total).toBe(0);
    expect(movements.movements.length).toBe(0);

    // Verify persistence upon reload from saleRepo
    const savedSale = await saleRepo.getSaleById(res.saleWithDetails!.sale.id);
    expect(savedSale).not.toBeNull();
    expect(savedSale?.items[0].lineType).toBe('OPEN_AMOUNT');
    expect(savedSale?.items[0].productId).toBeNull();
    expect(savedSale?.items[0].productNameSnapshot).toBe('Servicio técnico');
    expect(savedSale?.items[0].lineTotal).toBe(5000);
  });

  // =========================================================================
  // 9. REPORTS / ANALYTICS & PRODUCT RANKINGS
  // =========================================================================
  it('9. Mixed Sale Analytics: Gross includes all 3 lines, Top Products excludes OPEN_AMOUNT', async () => {
    // 1. Coca Cola
    const coke: Product = {
      id: 'prod_coke',
      businessId,
      name: 'Coca Cola 1.5L',
      baseUnit: 'UNIT',
      saleMode: 'UNIT',
      salePrice: 2000,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(coke);
    await movementRepo.recordMovement({
      businessId,
      productId: coke.id,
      movementType: 'OPENING',
      quantityDelta: 10000, // 10 units
      unitCost: 1200,
      totalCost: 12000,
      createdByUserId: userId,
    });

    // 2. Almendras
    const almendras: Product = {
      id: 'prod_almendras_rep',
      businessId,
      name: 'Almendras',
      baseUnit: 'KG',
      saleMode: 'WEIGHT',
      salePrice: 8990,
      featured: false,
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await productRepo.save(almendras);
    await movementRepo.recordMovement({
      businessId,
      productId: almendras.id,
      movementType: 'OPENING',
      quantityDelta: 5000, // 5kg
      unitCost: 5000,
      totalCost: 25000,
      createdByUserId: userId,
    });

    // Mixed sale:
    // Line 1: 2x Coca Cola ($4.000)
    // Line 2: 260g Almendras ($2.337)
    // Line 3: $5.000 Servicio técnico (OPEN_AMOUNT)
    // Total = 4000 + 2337 + 5000 = 11337
    const saleRes = await completeSale.execute({
      businessId,
      userId,
      userName: 'Don Pepe',
      idempotencyKey: 'idem_mixed_sale',
      items: [
        {
          productId: coke.id,
          saleMode: 'UNIT',
          quantity: 2000, // 2 units
          expectedUnitPrice: 2000,
        },
        {
          productId: almendras.id,
          saleMode: 'WEIGHT',
          weightGrams: 260,
          quantity: 260,
          expectedUnitPrice: 8990,
        },
        {
          productId: null,
          lineType: 'OPEN_AMOUNT',
          customDescription: 'Servicio técnico',
          quantity: 1000,
          expectedUnitPrice: 5000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 11337,
        },
      ],
    });

    expect(saleRes.success).toBe(true);

    // Period Summary includes all lines
    const summary = await saleRepo.getSalesSummary(businessId, '2020-01-01T00:00:00Z', '2099-01-01T00:00:00Z');
    expect(summary.totalSales).toBe(11337);

    // Top Selling Products must have only Coca Cola and Almendras (length 2, NO Servicio técnico)
    const topProds = await saleRepo.getTopSellingProducts(businessId, '2020-01-01T00:00:00Z', '2099-01-01T00:00:00Z', 10);
    expect(topProds.length).toBe(2);
    expect(topProds.some((tp) => tp.productName === 'Servicio técnico')).toBe(false);
    expect(topProds.find((tp) => tp.productId === coke.id)?.totalQuantityMajor).toBe(2);
    expect(topProds.find((tp) => tp.productId === almendras.id)?.totalQuantityMajor).toBe(0.26);
    expect(topProds.find((tp) => tp.productId === coke.id)?.totalRevenue).toBe(4000);
    expect(topProds.find((tp) => tp.productId === almendras.id)?.totalRevenue).toBe(2337);
  });

  // =========================================================================
  // 11. RECEIPT CLEAN FORMATTING
  // =========================================================================
  it('11. Receipt Customer-Facing Formatting: No technical leak tokens', () => {
    const mockSale = {
      id: 'sale_1',
      businessId,
      cashSessionId: 'session_qa',
      saleSequence: 1,
      saleNumber: 'V-000001',
      completedAt: '2026-09-01T12:00:00Z',
      createdByNameSnapshot: 'Don Pepe',
      createdByUserId: userId,
      customerId: null,
      customerNameSnapshot: 'Consumidor final',
      currencyCode: 'CLP',
      total: 7337,
      subtotal: 7337,
      discountTotal: 0,
      taxTotal: 0,
      changeAmount: 0,
      status: 'COMPLETED' as const,
      idempotencyKey: 'idem_mock',
      createdAt: '2026-09-01T12:00:00Z',
    };

    const mockItems = [
      {
        id: 'item_1',
        saleId: 'sale_1',
        lineType: 'PRODUCT' as const,
        productId: 'prod_1',
        presentationId: null,
        productNameSnapshot: 'Almendras',
        presentationNameSnapshot: null,
        baseUnit: 'KG' as const,
        saleMode: 'WEIGHT' as const,
        weightGrams: 260,
        quantity: 260,
        unitPrice: 8990,
        discountAmount: 0,
        lineTotal: 2337,
        lineCostTotal: null,
        costQualitySnapshot: 'NONE' as const,
      },
      {
        id: 'item_2',
        saleId: 'sale_1',
        lineType: 'OPEN_AMOUNT' as const,
        productId: null,
        presentationId: null,
        productNameSnapshot: 'Servicio técnico',
        presentationNameSnapshot: null,
        baseUnit: 'UNIT' as const,
        saleMode: 'UNIT' as const,
        weightGrams: null,
        quantity: 1000,
        unitPrice: 5000,
        discountAmount: 0,
        lineTotal: 5000,
        lineCostTotal: null,
        costQualitySnapshot: 'NONE' as const,
      },
    ];

    const mockPayments = [
      {
        id: 'pay_1',
        saleId: 'sale_1',
        paymentMethodId: cashMethodId,
        methodCodeSnapshot: 'CASH',
        methodNameSnapshot: 'Efectivo',
        amount: 7337,
        receivedAmount: 7337,
        changeAmount: 0,
        currencyCode: 'CLP',
      },
    ];

    const receipt = buildReceiptDTO(
      mockSale as unknown as import('../domain/sales/Sale').Sale,
      mockItems as unknown as import('../domain/sales/SaleItem').SaleItem[],
      mockPayments as unknown as import('../domain/sales/SalePayment').SalePayment[],
      {
        name: 'Don Pepe Minimarket',
      }
    );

    expect(receipt.items[0].displayName).toBe('Almendras');
    expect(receipt.items[0].quantityFormatted).toBe('260 g');
    expect(receipt.items[0].unitPriceFormatted).toBe('$ 8.990/kg');

    expect(receipt.items[1].displayName).toBe('Servicio técnico');
    expect(receipt.items[1].quantityFormatted).toBe('');
    expect(receipt.items[1].unitPriceFormatted).toBe('$ 5.000');

    // Verify absence of raw technical tokens and fake units
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain('"WEIGHT"');
    expect(serialized).not.toContain('"OPEN_AMOUNT"');
    expect(serialized).not.toContain('1 ud');

    // Test fallback when customDescription is empty:
    const mockEmptyDescItem = [
      {
        id: 'item_3',
        saleId: 'sale_1',
        lineType: 'OPEN_AMOUNT' as const,
        productId: null,
        presentationId: null,
        productNameSnapshot: '',
        presentationNameSnapshot: null,
        baseUnit: 'UNIT' as const,
        saleMode: 'UNIT' as const,
        weightGrams: null,
        quantity: 1000,
        unitPrice: 3500,
        discountAmount: 0,
        lineTotal: 3500,
        lineCostTotal: null,
        costQualitySnapshot: 'NONE' as const,
      },
    ];

    const fallbackReceipt = buildReceiptDTO(
      mockSale as unknown as import('../domain/sales/Sale').Sale,
      mockEmptyDescItem as unknown as import('../domain/sales/SaleItem').SaleItem[],
      mockPayments as unknown as import('../domain/sales/SalePayment').SalePayment[],
      { name: 'Don Pepe Minimarket' }
    );
    expect(fallbackReceipt.items[0].displayName).toBe('Monto libre');
    expect(fallbackReceipt.items[0].quantityFormatted).toBe('');
  });

  // =========================================================================
  // 12. MULTI-CURRENCY WEIGHTED MATH VERIFICATION (CLP, COP, USD, VES)
  // =========================================================================
  it('12. Multi-Currency Weighted Calculations: CLP, COP, USD, VES', () => {
    // CLP (zero-decimal): 8.990 CLP/kg * 260g = $2.337 CLP
    expect(calculateWeightedLineTotal(8990, 260)).toBe(2337);

    // COP (zero-decimal): $15.000 COP/kg * 350g = $5.250 COP
    expect(calculateWeightedLineTotal(15000, 350)).toBe(5250);

    // USD (two-decimal): $8.99/kg (899 cents) * 260g -> round(899 * 260 / 1000) = 234 cents ($2.34)
    expect(calculateWeightedLineTotal(899, 260)).toBe(234);

    // USD (two-decimal): $12.49/kg (1249 cents) * 430g -> round(1249 * 430 / 1000) = 537 cents ($5.37)
    expect(calculateWeightedLineTotal(1249, 430)).toBe(537);

    // VES (two-decimal): Bs. 45.50/kg (4550 céntimos) * 150g -> round(4550 * 150 / 1000) = 683 céntimos (Bs. 6.83)
    expect(calculateWeightedLineTotal(4550, 150)).toBe(683);
  });
});

