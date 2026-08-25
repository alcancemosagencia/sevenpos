import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCashSession } from '../../../../src/application/cash/OpenCashSession';
import { InMemoryCashSessionRepository } from '../../../../src/infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../../src/infrastructure/repositories/InMemoryCashRegisterRepository';

describe('OpenCashSession Use Case Tests', () => {
  let sessionRepo: InMemoryCashSessionRepository;
  let registerRepo: InMemoryCashRegisterRepository;
  let useCase: OpenCashSession;

  beforeEach(() => {
    sessionRepo = new InMemoryCashSessionRepository();
    registerRepo = new InMemoryCashRegisterRepository();
    useCase = new OpenCashSession(sessionRepo, registerRepo);
  });

  it('successfully opens cash session and records initial OPENING movement', async () => {
    const res = await useCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: 20000,
      currencyCode: 'CLP',
      note: 'Turno mañana',
    });

    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.status).toBe('OPEN');
    expect(res.session?.openingAmount).toBe(20000);

    // Verify initial OPENING movement
    const movements = await sessionRepo.listMovementsBySession(res.session!.id, 'biz-1');
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe('OPENING');
    expect(movements[0].amount).toBe(20000);

    // Verify expected cash equals 20.000 (NOT 40.000)
    const expected = await sessionRepo.getExpectedCashForSession(res.session!.id, 'biz-1');
    expect(expected).toBe(20000);
  });

  it('rejects double open when an active session already exists', async () => {
    // First open
    const res1 = await useCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: 10000,
    });
    expect(res1.success).toBe(true);

    // Second open for same business/register
    const res2 = await useCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: 15000,
    });
    expect(res2.success).toBe(false);
    expect(res2.errorType).toBe('CASH_SESSION_ALREADY_OPEN');
  });

  it('rejects invalid or negative opening amounts', async () => {
    const res = await useCase.execute({
      businessId: 'biz-1',
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Omar',
      openingAmount: -500,
    });
    expect(res.success).toBe(false);
    expect(res.errorType).toBe('INVALID_OPENING_AMOUNT');
  });
});
