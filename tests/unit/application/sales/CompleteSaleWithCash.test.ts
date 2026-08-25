import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteSale } from '../../../../src/application/sales/CompleteSale';
import { OpenCashSession } from '../../../../src/application/cash/OpenCashSession';
import { InMemorySaleRepository } from '../../../../src/infrastructure/repositories/InMemorySaleRepository';
import { InMemoryPaymentMethodRepository } from '../../../../src/infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryProductRepository } from '../../../../src/infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../../src/infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryInventoryMovementRepository } from '../../../../src/infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../../src/infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryBusinessRepository } from '../../../../src/infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryCashSessionRepository } from '../../../../src/infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../../src/infrastructure/repositories/InMemoryCashRegisterRepository';
import { toScaledQuantity } from '../../../../src/domain/common/quantity/Quantity';

describe('CompleteSale with Cash Session & Movement Tests', () => {
  let saleRepo: InMemorySaleRepository;
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let productRepo: InMemoryProductRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let businessRepo: InMemoryBusinessRepository;
  let cashSessionRepo: InMemoryCashSessionRepository;
  let cashRegisterRepo: InMemoryCashRegisterRepository;
  let completeSaleUseCase: CompleteSale;
  let openCashUseCase: OpenCashSession;

  const businessId = 'biz-test';
  const userId = 'user-test';
  const userName = 'Omar';
  let productId: string;
  let cashMethodId: string;
  let debitMethodId: string;

  beforeEach(async () => {
    movementRepo = new InMemoryInventoryMovementRepository();
    cashSessionRepo = new InMemoryCashSessionRepository();
    cashRegisterRepo = new InMemoryCashRegisterRepository();
    saleRepo = new InMemorySaleRepository(movementRepo, cashSessionRepo);
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    productRepo = new InMemoryProductRepository();
    presentationRepo = new InMemoryProductPresentationRepository();
    lotRepo = new InMemoryInventoryLotRepository();
    businessRepo = new InMemoryBusinessRepository();

    completeSaleUseCase = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo
    );

    openCashUseCase = new OpenCashSession(cashSessionRepo, cashRegisterRepo);

    // Setup product with 10 units at $1.000
    const prod = {
      id: 'prod-1',
      businessId,
      name: 'Bebida 500ml',
      baseUnit: 'UNIT' as const,
      salePrice: 1000,
      costPrice: 600,
      active: true,
      createdAt: '2026-08-23T10:00:00Z',
      updatedAt: '2026-08-23T10:00:00Z',
    };
    await productRepo.save(prod);
    productId = prod.id;

    // Add stock (10 units = 10000 scaled)
    await movementRepo.recordMovement({
      id: 'mov-init',
      businessId,
      productId,
      movementType: 'OPENING',
      quantityDelta: toScaledQuantity(10),
      occurredAt: '2026-08-23T10:00:00Z',
      createdAt: '2026-08-23T10:00:00Z',
      createdByUserId: userId,
    });

    // Setup payment methods
    await paymentMethodRepo.ensureDefaultMethods(businessId);
    const cashMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    const debitMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'DEBIT_CARD');
    cashMethodId = cashMethod!.id;
    debitMethodId = debitMethod!.id;
  });

  it('rejects sale with CASH_SESSION_REQUIRED when no cash session is open', async () => {
    const res = await completeSaleUseCase.execute({
      businessId,
      userId,
      userName,
      idempotencyKey: 'idemp-1',
      items: [
        {
          productId,
          quantity: toScaledQuantity(1),
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 1000,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('CASH_SESSION_REQUIRED');

    // Verify 0 sales created and 0 stock deducted
    const sales = await saleRepo.listSales(businessId);
    expect(sales.length).toBe(0);
    const stock = await movementRepo.getCurrentStock(productId, businessId);
    expect(stock).toBe(toScaledQuantity(10));
  });

  it('completes sale with CASH and atomically creates single SALE_CASH movement', async () => {
    // 1. Open cash session with 20.000
    const openRes = await openCashUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount: 20000,
    });
    const sessionId = openRes.session!.id;

    // 2. Complete sale with 3 units = $3.000 cash (received 5000, change 2000)
    const saleRes = await completeSaleUseCase.execute({
      businessId,
      userId,
      userName,
      idempotencyKey: 'idemp-sale-cash',
      items: [
        {
          productId,
          quantity: toScaledQuantity(3),
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 3000,
          receivedAmount: 5000,
          changeAmount: 2000,
        },
      ],
    });

    expect(saleRes.success).toBe(true);
    expect(saleRes.saleWithDetails?.sale.cashSessionId).toBe(sessionId);

    // Verify expected cash = 20.000 + 3.000 = 23.000
    const expected = await cashSessionRepo.getExpectedCashForSession(sessionId, businessId);
    expect(expected).toBe(23000);

    // Verify exactly 1 SALE_CASH movement exists with amount = 3000 (NOT 5000)
    const movs = await cashSessionRepo.listMovementsBySession(sessionId, businessId);
    const saleMov = movs.find((m) => m.movementType === 'SALE_CASH');
    expect(saleMov).toBeDefined();
    expect(saleMov?.amount).toBe(3000);
    expect(saleMov?.referenceId).toBe(saleRes.saleWithDetails!.sale.id);
  });

  it('completes sale with DEBIT: links cashSessionId but does not increase expected physical cash', async () => {
    // Open cash session with 20.000
    const openRes = await openCashUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount: 20000,
    });
    const sessionId = openRes.session!.id;

    // Complete sale with DEBIT = 2000
    const saleRes = await completeSaleUseCase.execute({
      businessId,
      userId,
      userName,
      idempotencyKey: 'idemp-sale-debit',
      items: [
        {
          productId,
          quantity: toScaledQuantity(2),
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: debitMethodId,
          amount: 2000,
        },
      ],
    });

    expect(saleRes.success).toBe(true);
    expect(saleRes.saleWithDetails?.sale.cashSessionId).toBe(sessionId);

    // Expected cash remains 20.000
    const expected = await cashSessionRepo.getExpectedCashForSession(sessionId, businessId);
    expect(expected).toBe(20000);

    // Verify 0 SALE_CASH movements
    const movs = await cashSessionRepo.listMovementsBySession(sessionId, businessId);
    expect(movs.filter((m) => m.movementType === 'SALE_CASH').length).toBe(0);
  });

  it('completes multipayment: cash $1000 + debit $2000 -> creates 1 SALE_CASH of $1000', async () => {
    // Open cash session with 10.000
    const openRes = await openCashUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount: 10000,
    });
    const sessionId = openRes.session!.id;

    const saleRes = await completeSaleUseCase.execute({
      businessId,
      userId,
      userName,
      idempotencyKey: 'idemp-multipay',
      items: [
        {
          productId,
          quantity: toScaledQuantity(3),
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 1000,
        },
        {
          paymentMethodId: debitMethodId,
          amount: 2000,
        },
      ],
    });

    expect(saleRes.success).toBe(true);

    // Expected cash = 10.000 + 1.000 = 11.000
    const expected = await cashSessionRepo.getExpectedCashForSession(sessionId, businessId);
    expect(expected).toBe(11000);

    // Exactly 1 SALE_CASH movement of 1000
    const movs = await cashSessionRepo.listMovementsBySession(sessionId, businessId);
    const saleMovs = movs.filter((m) => m.movementType === 'SALE_CASH');
    expect(saleMovs.length).toBe(1);
    expect(saleMovs[0].amount).toBe(1000);
  });

  it('replaying idempotent sale does not create duplicate SALE_CASH movements', async () => {
    await openCashUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount: 10000,
    });

    const payload = {
      businessId,
      userId,
      userName,
      idempotencyKey: 'idemp-replay-test',
      items: [
        {
          productId,
          quantity: toScaledQuantity(1),
          expectedUnitPrice: 1000,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethodId,
          amount: 1000,
        },
      ],
    };

    // First execution
    const res1 = await completeSaleUseCase.execute(payload);
    expect(res1.success).toBe(true);
    expect(res1.isIdempotentReplay).toBeFalsy();

    // Replay
    const res2 = await completeSaleUseCase.execute(payload);
    expect(res2.success).toBe(true);
    expect(res2.isIdempotentReplay).toBe(true);

    // Verify exactly 1 sale in repo and 1 SALE_CASH movement
    const sales = await saleRepo.listSales(businessId);
    expect(sales.length).toBe(1);

    const activeSession = await cashSessionRepo.getActiveSession(businessId);
    const movs = await cashSessionRepo.listMovementsBySession(activeSession!.id, businessId);
    expect(movs.filter((m) => m.movementType === 'SALE_CASH').length).toBe(1);
  });
});
