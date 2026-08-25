import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCashSession } from '../../../../src/application/cash/OpenCashSession';
import { AddCashMovement } from '../../../../src/application/cash/AddCashMovement';
import { InMemoryCashSessionRepository } from '../../../../src/infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../../src/infrastructure/repositories/InMemoryCashRegisterRepository';

describe('AddCashMovement Use Case Tests', () => {
  let sessionRepo: InMemoryCashSessionRepository;
  let registerRepo: InMemoryCashRegisterRepository;
  let openUseCase: OpenCashSession;
  let addMovementUseCase: AddCashMovement;
  let activeSessionId: string;

  beforeEach(async () => {
    sessionRepo = new InMemoryCashSessionRepository();
    registerRepo = new InMemoryCashRegisterRepository();
    openUseCase = new OpenCashSession(sessionRepo, registerRepo);
    addMovementUseCase = new AddCashMovement(sessionRepo);

    // Open session with 10.000 CLP
    const res = await openUseCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: 10000,
      currencyCode: 'CLP',
    });
    activeSessionId = res.session!.id;
  });

  it('successfully records CASH_IN and increases expected cash', async () => {
    const res = await addMovementUseCase.execute({
      businessId: 'biz-1',
      cashSessionId: activeSessionId,
      movementType: 'CASH_IN',
      amount: 5000,
      reason: 'Fondo adicional',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'Omar',
    });

    expect(res.success).toBe(true);
    expect(res.movement?.movementType).toBe('CASH_IN');
    expect(res.movement?.amount).toBe(5000);

    const expected = await sessionRepo.getExpectedCashForSession(activeSessionId, 'biz-1');
    expect(expected).toBe(15000); // 10.000 + 5.000
  });

  it('successfully records CASH_OUT and decreases expected cash', async () => {
    const res = await addMovementUseCase.execute({
      businessId: 'biz-1',
      cashSessionId: activeSessionId,
      movementType: 'CASH_OUT',
      amount: 2000,
      reason: 'Gasto menor',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'Omar',
    });

    expect(res.success).toBe(true);
    expect(res.movement?.movementType).toBe('CASH_OUT');
    expect(res.movement?.amount).toBe(2000);

    const expected = await sessionRepo.getExpectedCashForSession(activeSessionId, 'biz-1');
    expect(expected).toBe(8000); // 10.000 - 2.000
  });

  it('rejects CASH_OUT if amount exceeds available expected cash', async () => {
    // Current balance: 10.000 -> Try to withdraw 12.000
    const res = await addMovementUseCase.execute({
      businessId: 'biz-1',
      cashSessionId: activeSessionId,
      movementType: 'CASH_OUT',
      amount: 12000,
      reason: 'Retiro excesivo',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'Omar',
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('INSUFFICIENT_CASH');

    const expected = await sessionRepo.getExpectedCashForSession(activeSessionId, 'biz-1');
    expect(expected).toBe(10000); // Balance untouched
  });
});
