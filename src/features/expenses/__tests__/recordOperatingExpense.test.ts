import { describe, it, expect, beforeEach } from 'vitest';
import { RecordOperatingExpense } from '../../../application/expenses/RecordOperatingExpense';
import { CreateExpenseCategory } from '../../../application/expenses/CreateExpenseCategory';
import { UpdateExpenseCategory } from '../../../application/expenses/UpdateExpenseCategory';
import { EnsureDefaultExpenseCategories } from '../../../application/expenses/EnsureDefaultExpenseCategories';
import { InMemoryOperatingExpenseRepository } from '../../../infrastructure/repositories/InMemoryOperatingExpenseRepository';
import { InMemoryExpenseCategoryRepository } from '../../../infrastructure/repositories/InMemoryExpenseCategoryRepository';
import { InMemoryExpenseQueryRepository } from '../../../infrastructure/repositories/InMemoryExpenseQueryRepository';
import { InMemoryCashSessionRepository } from '../../../infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../infrastructure/repositories/InMemoryCashRegisterRepository';
import { InMemorySupplierRepository } from '../../../infrastructure/repositories/InMemorySupplierRepository';
import { normalizeExpenseCategoryName } from '../../../domain/expenses/ExpenseCategory';
import { calculateExpectedCash } from '../../../domain/cash/CashSessionMath';

describe('AG-10 Operating Expenses Domain & Integration Tests', () => {
  const businessId = 'biz-001';
  const otherBusinessId = 'biz-002';
  const userId = 'user-001';
  const userName = 'José Pérez';

  let expenseRepo: InMemoryOperatingExpenseRepository;
  let categoryRepo: InMemoryExpenseCategoryRepository;
  let queryRepo: InMemoryExpenseQueryRepository;
  let cashSessionRepo: InMemoryCashSessionRepository;
  let cashRegisterRepo: InMemoryCashRegisterRepository;
  let supplierRepo: InMemorySupplierRepository;

  let recordExpenseUseCase: RecordOperatingExpense;
  let createCategoryUseCase: CreateExpenseCategory;
  let updateCategoryUseCase: UpdateExpenseCategory;
  let ensureDefaultsUseCase: EnsureDefaultExpenseCategories;

  beforeEach(async () => {
    cashSessionRepo = new InMemoryCashSessionRepository();
    cashRegisterRepo = new InMemoryCashRegisterRepository();
    expenseRepo = new InMemoryOperatingExpenseRepository(cashSessionRepo);
    categoryRepo = new InMemoryExpenseCategoryRepository();
    queryRepo = new InMemoryExpenseQueryRepository(expenseRepo, categoryRepo);
    supplierRepo = new InMemorySupplierRepository();

    recordExpenseUseCase = new RecordOperatingExpense(
      expenseRepo,
      categoryRepo,
      cashSessionRepo,
      cashRegisterRepo,
      supplierRepo
    );

    createCategoryUseCase = new CreateExpenseCategory(categoryRepo);
    updateCategoryUseCase = new UpdateExpenseCategory(categoryRepo);
    ensureDefaultsUseCase = new EnsureDefaultExpenseCategories(categoryRepo);

    // Seed default categories and default register
    await ensureDefaultsUseCase.execute(businessId);
    await cashRegisterRepo.ensureDefaultRegister(businessId);
  });

  it('1. Category Normalization: removes diacritics, trims, lowercases and collapses spaces', () => {
    expect(normalizeExpenseCategoryName('  Servicios   Básicos ')).toBe('servicios basicos');
    expect(normalizeExpenseCategoryName('MANTENCIÓN & REPARACIÓN')).toBe('mantencion & reparacion');
    expect(normalizeExpenseCategoryName('Café y Útiles')).toBe('cafe y utiles');
  });

  it('2. Category Uniqueness: detects normalized duplicates', async () => {
    await expect(
      createCategoryUseCase.execute(businessId, {
        name: 'Arriendo', // Already exists as default
      })
    ).rejects.toThrow(/EXPENSE_CATEGORY_DUPLICATE/);

    await expect(
      createCategoryUseCase.execute(businessId, {
        name: '  ARRIENDO  ',
      })
    ).rejects.toThrow(/EXPENSE_CATEGORY_DUPLICATE/);

    await expect(
      createCategoryUseCase.execute(businessId, {
        name: 'arriendo',
      })
    ).rejects.toThrow(/EXPENSE_CATEGORY_DUPLICATE/);
  });

  it('3. Default Category Rename: stable system_key prevents resurrection', async () => {
    const internetCat = await categoryRepo.findBySystemKey(businessId, 'INTERNET_PHONE');
    expect(internetCat).not.toBeNull();
    expect(internetCat?.name).toBe('Internet y telefonía');

    // Rename to Telecomunicaciones
    await updateCategoryUseCase.execute(businessId, internetCat!.id, {
      name: 'Telecomunicaciones',
    });

    // Re-run ensureDefaults
    await ensureDefaultsUseCase.execute(businessId);

    const categories = await categoryRepo.list(businessId, true);
    const internetMatches = categories.filter(
      (c) => c.systemKey === 'INTERNET_PHONE' || c.name === 'Internet y telefonía'
    );
    expect(internetMatches.length).toBe(1);
    expect(internetMatches[0].name).toBe('Telecomunicaciones');
  });

  it('4. Default Category Deactivation: remains inactive on ensureDefaults', async () => {
    const marketingCat = await categoryRepo.findBySystemKey(businessId, 'MARKETING');
    expect(marketingCat).not.toBeNull();

    // Deactivate
    await updateCategoryUseCase.execute(businessId, marketingCat!.id, {
      active: false,
    });

    // Re-run ensureDefaults
    await ensureDefaultsUseCase.execute(businessId);

    const reloaded = await categoryRepo.findById(businessId, marketingCat!.id);
    expect(reloaded?.active).toBe(false);
  });

  it('5. Record Transfer Expense: no cash session needed, creates 0 cash movements', async () => {
    const rentCat = await categoryRepo.findBySystemKey(businessId, 'RENT');
    expect(rentCat).not.toBeNull();

    const expense = await recordExpenseUseCase.execute(businessId, userId, userName, {
      categoryId: rentCat!.id,
      description: 'Pago arriendo mensual local',
      amount: 350000,
      currencyCode: 'CLP',
      paymentMethodCode: 'TRANSFER',
      expenseDate: '2026-08-24',
      referenceDocument: 'Factura 1234',
      idempotencyKey: 'idem-transfer-1',
    });

    expect(expense.id).toBeDefined();
    expect(expense.expenseNumber).toBe('GTO-000001');
    expect(expense.amount).toBe(350000);
    expect(expense.paymentMethodCode).toBe('TRANSFER');
    expect(expense.cashSessionId).toBeNull();
    expect(expense.cashMovementId).toBeNull();

    // Check query repo
    const listRes = await queryRepo.list(businessId);
    expect(listRes.totalCount).toBe(1);
    expect(listRes.expenses[0].expenseNumber).toBe('GTO-000001');
  });

  it('6. Record Cash Expense with Open Cash Session: creates CASH_OUT movement & updates expected cash', async () => {
    const registers = await cashRegisterRepo.list(businessId);
    const register = registers[0];

    // Open cash session with $50.000
    const session = await cashSessionRepo.openSession({
      session: {
        id: 'session-cash-1',
        businessId,
        cashRegisterId: register.id,
        openedByUserId: userId,
        openedByNameSnapshot: userName,
        openedAt: new Date().toISOString(),
        openingAmount: 50000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov-open-1',
        businessId,
        cashSessionId: 'session-cash-1',
        cashRegisterId: register.id,
        movementType: 'OPENING',
        amount: 50000,
        currencyCode: 'CLP',
        reason: 'Fondo inicial',
        referenceType: 'SESSION',
        referenceId: 'session-cash-1',
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: new Date().toISOString(),
      },
    });

    const cleaningCat = await categoryRepo.findBySystemKey(businessId, 'CLEANING');

    const expense = await recordExpenseUseCase.execute(businessId, userId, userName, {
      categoryId: cleaningCat!.id,
      description: 'Artículos de limpieza e insumos',
      amount: 8000,
      currencyCode: 'CLP',
      paymentMethodCode: 'CASH',
      expenseDate: '2026-08-24',
      cashRegisterId: register.id,
      referenceDocument: 'Boleta 987',
      idempotencyKey: 'idem-cash-1',
    });

    expect(expense.expenseNumber).toBe('GTO-000001');
    expect(expense.amount).toBe(8000);
    expect(expense.cashSessionId).toBe(session.id);
    expect(expense.cashMovementId).toBeDefined();

    // Verify cash movements
    const movements = await cashSessionRepo.listMovementsBySession(session.id, businessId);
    expect(movements.length).toBe(2);

    const cashOut = movements.find((m) => m.movementType === 'CASH_OUT');
    expect(cashOut).toBeDefined();
    expect(cashOut?.amount).toBe(8000);
    expect(cashOut?.referenceType).toBe('OPERATING_EXPENSE');
    expect(cashOut?.referenceId).toBe(expense.id);

    // Verify live expected physical cash: 50.000 - 8.000 = 42.000
    const expected = calculateExpectedCash(movements);
    expect(expected).toBe(42000);
  });

  it('7. Cash Expense with Closed Cash Session: fails with CASH_SESSION_REQUIRED', async () => {
    const cleaningCat = await categoryRepo.findBySystemKey(businessId, 'CLEANING');

    await expect(
      recordExpenseUseCase.execute(businessId, userId, userName, {
        categoryId: cleaningCat!.id,
        description: 'Artículos de aseo',
        amount: 8000,
        currencyCode: 'CLP',
        paymentMethodCode: 'CASH',
        expenseDate: '2026-08-24',
        idempotencyKey: 'idem-fail-closed',
      })
    ).rejects.toThrow(/CASH_SESSION_REQUIRED/);
  });

  it('8. Cash Expense with Insufficient Funds: fails with INSUFFICIENT_CASH', async () => {
    const registers = await cashRegisterRepo.list(businessId);
    const register = registers[0];

    // Open session with only $5.000
    const session = await cashSessionRepo.openSession({
      session: {
        id: 'session-low-cash',
        businessId,
        cashRegisterId: register.id,
        openedByUserId: userId,
        openedByNameSnapshot: userName,
        openedAt: new Date().toISOString(),
        openingAmount: 5000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov-open-low',
        businessId,
        cashSessionId: 'session-low-cash',
        cashRegisterId: register.id,
        movementType: 'OPENING',
        amount: 5000,
        currencyCode: 'CLP',
        reason: 'Fondo inicial bajo',
        referenceType: 'SESSION',
        referenceId: 'session-low-cash',
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: new Date().toISOString(),
      },
    });

    const cleaningCat = await categoryRepo.findBySystemKey(businessId, 'CLEANING');

    // Attempt $8.000 cash expense
    await expect(
      recordExpenseUseCase.execute(businessId, userId, userName, {
        categoryId: cleaningCat!.id,
        description: 'Artículos de limpieza',
        amount: 8000,
        currencyCode: 'CLP',
        paymentMethodCode: 'CASH',
        expenseDate: '2026-08-24',
        cashRegisterId: register.id,
        idempotencyKey: 'idem-insufficient',
      })
    ).rejects.toThrow(/INSUFFICIENT_CASH/);

    // Ledger must have 0 CASH_OUT movements
    const movements = await cashSessionRepo.listMovementsBySession(session.id, businessId);
    expect(movements.length).toBe(1);
  });

  it('9. Multi-Register Scoping Test: Expense on Register A affects only Register A', async () => {
    // Create Register A and Register B
    const regA = {
      id: 'reg-a',
      businessId,
      name: 'Caja A',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const regB = {
      id: 'reg-b',
      businessId,
      name: 'Caja B',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await cashRegisterRepo.save(regA);
    await cashRegisterRepo.save(regB);

    // Open session A with 20.000
    const sessionA = await cashSessionRepo.openSession({
      session: {
        id: 'session-a',
        businessId,
        cashRegisterId: regA.id,
        openedByUserId: userId,
        openedByNameSnapshot: userName,
        openedAt: new Date().toISOString(),
        openingAmount: 20000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov-open-a',
        businessId,
        cashSessionId: 'session-a',
        cashRegisterId: regA.id,
        movementType: 'OPENING',
        amount: 20000,
        currencyCode: 'CLP',
        reason: 'Apertura A',
        referenceType: 'SESSION',
        referenceId: 'session-a',
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: new Date().toISOString(),
      },
    });

    // Open session B with 40.000
    const sessionB = await cashSessionRepo.openSession({
      session: {
        id: 'session-b',
        businessId,
        cashRegisterId: regB.id,
        openedByUserId: userId,
        openedByNameSnapshot: userName,
        openedAt: new Date().toISOString(),
        openingAmount: 40000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov-open-b',
        businessId,
        cashSessionId: 'session-b',
        cashRegisterId: regB.id,
        movementType: 'OPENING',
        amount: 40000,
        currencyCode: 'CLP',
        reason: 'Apertura B',
        referenceType: 'SESSION',
        referenceId: 'session-b',
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: new Date().toISOString(),
      },
    });

    const suppliesCat = await categoryRepo.findBySystemKey(businessId, 'SUPPLIES');

    // Register $5.000 CASH expense specifically against Register A
    const expense = await recordExpenseUseCase.execute(businessId, userId, userName, {
      categoryId: suppliesCat!.id,
      description: 'Compra de bolsas y cinta',
      amount: 5000,
      currencyCode: 'CLP',
      paymentMethodCode: 'CASH',
      expenseDate: '2026-08-24',
      cashRegisterId: regA.id,
      idempotencyKey: 'idem-multi-reg-1',
    });

    expect(expense.cashSessionId).toBe(sessionA.id);

    // Verify Register A expected = 15.000
    const movsA = await cashSessionRepo.listMovementsBySession(sessionA.id, businessId);
    expect(calculateExpectedCash(movsA)).toBe(15000);

    // Verify Register B expected = 40.000 (completely untouched)
    const movsB = await cashSessionRepo.listMovementsBySession(sessionB.id, businessId);
    expect(calculateExpectedCash(movsB)).toBe(40000);
  });

  it('10. Idempotency: duplicate submission returns existing expense without duplicate CASH_OUT', async () => {
    const registers = await cashRegisterRepo.list(businessId);
    const register = registers[0];

    const session = await cashSessionRepo.openSession({
      session: {
        id: 'session-idem',
        businessId,
        cashRegisterId: register.id,
        openedByUserId: userId,
        openedByNameSnapshot: userName,
        openedAt: new Date().toISOString(),
        openingAmount: 50000,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialMovement: {
        id: 'mov-open-idem',
        businessId,
        cashSessionId: 'session-idem',
        cashRegisterId: register.id,
        movementType: 'OPENING',
        amount: 50000,
        currencyCode: 'CLP',
        reason: 'Fondo',
        referenceType: 'SESSION',
        referenceId: 'session-idem',
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: new Date().toISOString(),
      },
    });

    const rentCat = await categoryRepo.findBySystemKey(businessId, 'RENT');

    const dto = {
      categoryId: rentCat!.id,
      description: 'Pago arriendo',
      amount: 10000,
      currencyCode: 'CLP' as const,
      paymentMethodCode: 'CASH' as const,
      expenseDate: '2026-08-24',
      cashRegisterId: register.id,
      idempotencyKey: 'idem-duplicate-key-1',
    };

    const exp1 = await recordExpenseUseCase.execute(businessId, userId, userName, dto);
    const exp2 = await recordExpenseUseCase.execute(businessId, userId, userName, dto);

    expect(exp1.id).toBe(exp2.id);
    expect(exp1.expenseNumber).toBe(exp2.expenseNumber);

    const movs = await cashSessionRepo.listMovementsBySession(session.id, businessId);
    const cashOuts = movs.filter((m) => m.movementType === 'CASH_OUT');
    expect(cashOuts.length).toBe(1);
    expect(calculateExpectedCash(movs)).toBe(40000);
  });

  it('11. Multi-Tenant Safety: rejects foreign category or supplier from another business', async () => {
    // Category in other business
    await ensureDefaultsUseCase.execute(otherBusinessId);
    const otherCat = await categoryRepo.findBySystemKey(otherBusinessId, 'RENT');

    await expect(
      recordExpenseUseCase.execute(businessId, userId, userName, {
        categoryId: otherCat!.id, // Foreign category ID
        description: 'Test cross-tenant',
        amount: 1000,
        currencyCode: 'CLP',
        paymentMethodCode: 'TRANSFER',
        expenseDate: '2026-08-24',
        idempotencyKey: 'idem-tenant-safe',
      })
    ).rejects.toThrow(/EXPENSE_CATEGORY_NOT_FOUND/);
  });
});
