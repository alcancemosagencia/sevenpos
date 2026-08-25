import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCashSession } from '../../../../src/application/cash/OpenCashSession';
import { AddCashMovement } from '../../../../src/application/cash/AddCashMovement';
import { CloseCashSession } from '../../../../src/application/cash/CloseCashSession';
import { InMemoryCashSessionRepository } from '../../../../src/infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../../src/infrastructure/repositories/InMemoryCashRegisterRepository';

describe('CloseCashSession Use Case Tests', () => {
  let sessionRepo: InMemoryCashSessionRepository;
  let registerRepo: InMemoryCashRegisterRepository;
  let openUseCase: OpenCashSession;
  let addMovementUseCase: AddCashMovement;
  let closeUseCase: CloseCashSession;
  let activeSessionId: string;

  beforeEach(async () => {
    sessionRepo = new InMemoryCashSessionRepository();
    registerRepo = new InMemoryCashRegisterRepository();
    openUseCase = new OpenCashSession(sessionRepo, registerRepo);
    addMovementUseCase = new AddCashMovement(sessionRepo);
    closeUseCase = new CloseCashSession(sessionRepo);

    // Open with 20.000
    const res = await openUseCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: 20000,
      currencyCode: 'CLP',
    });
    activeSessionId = res.session!.id;

    // Add CASH_IN +5.000 -> Expected = 25.000
    await addMovementUseCase.execute({
      businessId: 'biz-1',
      cashSessionId: activeSessionId,
      movementType: 'CASH_IN',
      amount: 5000,
      reason: 'Fondo adicional',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'Omar',
    });
  });

  it('closes session with exact count and 0 difference', async () => {
    const res = await closeUseCase.execute({
      sessionId: activeSessionId,
      businessId: 'biz-1',
      closedByUserId: 'user-1',
      closedByNameSnapshot: 'Omar',
      countedCashAmount: 25000,
    });

    expect(res.success).toBe(true);
    expect(res.session?.status).toBe('CLOSED');
    expect(res.expectedCashAmount).toBe(25000);
    expect(res.differenceAmount).toBe(0);
  });

  it('closes session with deficit (-500) and preserves difference without artificial balancing rows', async () => {
    const res = await closeUseCase.execute({
      sessionId: activeSessionId,
      businessId: 'biz-1',
      closedByUserId: 'user-1',
      closedByNameSnapshot: 'Omar',
      countedCashAmount: 24500,
      closingNote: 'Faltante de $500 en monedas',
    });

    expect(res.success).toBe(true);
    expect(res.session?.status).toBe('CLOSED');
    expect(res.expectedCashAmount).toBe(25000);
    expect(res.differenceAmount).toBe(-500);

    // Verify no artificial closing adjustment was added to movements
    const movements = await sessionRepo.listMovementsBySession(activeSessionId, 'biz-1');
    expect(movements.some((m) => (m.movementType as string) === 'CLOSING_ADJUSTMENT')).toBe(false);
  });

  it('rejects movements once session is CLOSED', async () => {
    // Close session
    await closeUseCase.execute({
      sessionId: activeSessionId,
      businessId: 'biz-1',
      closedByUserId: 'user-1',
      closedByNameSnapshot: 'Omar',
      countedCashAmount: 25000,
    });

    // Attempt to add movement to closed session
    const res = await addMovementUseCase.execute({
      businessId: 'biz-1',
      cashSessionId: activeSessionId,
      movementType: 'CASH_IN',
      amount: 1000,
      reason: 'Movimiento tardío',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'Omar',
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('CASH_SESSION_ALREADY_CLOSED');
  });

  it('detects concurrency change if expected cash changed between preview and confirmation', async () => {
    // Pass stale preview expected cash (20.000 instead of current 25.000)
    const res = await closeUseCase.execute({
      sessionId: activeSessionId,
      businessId: 'biz-1',
      closedByUserId: 'user-1',
      closedByNameSnapshot: 'Omar',
      countedCashAmount: 25000,
      previewExpectedCash: 20000,
    });

    expect(res.success).toBe(false);
    expect(res.errorType).toBe('CASH_SESSION_CHANGED');
    expect(res.expectedCashAmount).toBe(25000);
  });
});
