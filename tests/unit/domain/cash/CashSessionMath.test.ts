import { describe, it, expect } from 'vitest';
import {
  calculateExpectedCash,
  calculateCashDifference,
  getMovementTypeSign,
  getSignedMovementAmount,
} from '../../../../src/domain/cash/CashSessionMath';
import { CashMovement } from '../../../../src/domain/cash/CashMovement';

describe('CashSessionMath Domain Tests', () => {
  it('correctly maps movement type signs and signed amounts', () => {
    expect(getMovementTypeSign('OPENING')).toBe(1);
    expect(getMovementTypeSign('SALE_CASH')).toBe(1);
    expect(getMovementTypeSign('CASH_IN')).toBe(1);
    expect(getMovementTypeSign('CASH_OUT')).toBe(-1);

    expect(getSignedMovementAmount({ amount: 1000, movementType: 'OPENING' } as CashMovement)).toBe(1000);
    expect(getSignedMovementAmount({ amount: 2500, movementType: 'SALE_CASH' } as CashMovement)).toBe(2500);
    expect(getSignedMovementAmount({ amount: 5000, movementType: 'CASH_IN' } as CashMovement)).toBe(5000);
    expect(getSignedMovementAmount({ amount: 3000, movementType: 'CASH_OUT' } as CashMovement)).toBe(-3000);
  });

  it('calculates expected cash purely from signed movements ledger without double-counting opening amount', () => {
    // Opening: 20.000, Sale Cash: 3.030, Cash In: 5.000, Cash Out: 2.000
    // Expected: 20.000 + 3.030 + 5.000 - 2.000 = 26.030 (NOT 46.030)
    const movements: CashMovement[] = [
      {
        id: 'mov-1',
        businessId: 'biz-1',
        cashSessionId: 'sess-1',
        cashRegisterId: 'reg-1',
        movementType: 'OPENING',
        amount: 20000,
        currencyCode: 'CLP',
        reason: 'Fondo inicial',
        createdByUserId: 'user-1',
        createdByNameSnapshot: 'Omar',
        createdAt: '2026-08-23T10:00:00Z',
      },
      {
        id: 'mov-2',
        businessId: 'biz-1',
        cashSessionId: 'sess-1',
        cashRegisterId: 'reg-1',
        movementType: 'SALE_CASH',
        amount: 3030,
        currencyCode: 'CLP',
        reason: 'Venta POS #1',
        createdByUserId: 'user-1',
        createdByNameSnapshot: 'Omar',
        createdAt: '2026-08-23T10:15:00Z',
      },
      {
        id: 'mov-3',
        businessId: 'biz-1',
        cashSessionId: 'sess-1',
        cashRegisterId: 'reg-1',
        movementType: 'CASH_IN',
        amount: 5000,
        currencyCode: 'CLP',
        reason: 'Fondo adicional',
        createdByUserId: 'user-1',
        createdByNameSnapshot: 'Omar',
        createdAt: '2026-08-23T11:00:00Z',
      },
      {
        id: 'mov-4',
        businessId: 'biz-1',
        cashSessionId: 'sess-1',
        cashRegisterId: 'reg-1',
        movementType: 'CASH_OUT',
        amount: 2000,
        currencyCode: 'CLP',
        reason: 'Retiro menor',
        createdByUserId: 'user-1',
        createdByNameSnapshot: 'Omar',
        createdAt: '2026-08-23T12:00:00Z',
      },
    ];

    const expected = calculateExpectedCash(movements);
    expect(expected).toBe(26030);
  });

  it('calculates cash difference correctly (counted - expected)', () => {
    // 1. Exact count
    expect(calculateCashDifference(50000, 50000)).toBe(0);

    // 2. Deficit / Short (-500)
    expect(calculateCashDifference(49500, 50000)).toBe(-500);

    // 3. Surplus / Over (+500)
    expect(calculateCashDifference(50500, 50000)).toBe(500);
  });
});
