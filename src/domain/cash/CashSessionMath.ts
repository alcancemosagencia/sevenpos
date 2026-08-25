import { CashMovement, CashMovementType } from './CashMovement';

/**
 * Returns the sign factor for a given CashMovementType.
 * OPENING, SALE_CASH, CASH_IN are positive entries (+1).
 * CASH_OUT is a negative outflow (-1).
 */
export function getMovementTypeSign(type: CashMovementType): 1 | -1 {
  switch (type) {
    case 'OPENING':
    case 'SALE_CASH':
    case 'CASH_IN':
      return 1;
    case 'CASH_OUT':
      return -1;
    default:
      throw new Error(`Tipo de movimiento de caja no reconocido: ${type}`);
  }
}

/**
 * Returns the signed integer amount of a single cash movement.
 */
export function getSignedMovementAmount(movement: CashMovement): number {
  const sign = getMovementTypeSign(movement.movementType);
  return sign * movement.amount;
}

/**
 * Calculates expected physical cash purely from the cash movements ledger.
 * The opening amount is already in the ledger as an OPENING movement (+),
 * so opening amount is NOT added twice.
 *
 * expected = SUM(signed movements) = OPENING + SALE_CASH + CASH_IN - CASH_OUT
 */
export function calculateExpectedCash(movements: CashMovement[]): number {
  return movements.reduce((acc, m) => acc + getSignedMovementAmount(m), 0);
}

/**
 * Calculates cash reconciliation difference.
 * difference = counted - expected
 * Positive value: Cash surplus (+ sobrante).
 * Negative value: Cash deficit (- faltante).
 * Zero: Exact balance.
 */
export function calculateCashDifference(countedAmount: number, expectedAmount: number): number {
  return countedAmount - expectedAmount;
}
