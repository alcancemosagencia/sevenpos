import { CashMovement } from '../../domain/cash/CashMovement';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { CurrencyCode } from '../../types/country';

export interface AddCashMovementInput {
  businessId: string;
  cashSessionId: string;
  movementType: 'CASH_IN' | 'CASH_OUT';
  amount: number; // Strictly positive minor integer
  currencyCode?: CurrencyCode;
  reason: string;
  note?: string | null;
  createdByUserId: string;
  createdByNameSnapshot: string;
}

export type AddCashMovementErrorType =
  | 'CASH_SESSION_NOT_FOUND'
  | 'CASH_SESSION_ALREADY_CLOSED'
  | 'INVALID_AMOUNT'
  | 'INSUFFICIENT_CASH'
  | 'INVALID_REASON'
  | 'TRANSACTION_FAILED';

export interface AddCashMovementResult {
  success: boolean;
  movement?: CashMovement;
  error?: string;
  errorType?: AddCashMovementErrorType;
}

export class AddCashMovement {
  constructor(private sessionRepo: CashSessionRepository) {}

  async execute(input: AddCashMovementInput): Promise<AddCashMovementResult> {
    if (!input.businessId || !input.cashSessionId) {
      return { success: false, error: 'businessId y cashSessionId son requeridos.', errorType: 'TRANSACTION_FAILED' };
    }

    if (
      typeof input.amount !== 'number' ||
      !Number.isInteger(input.amount) ||
      input.amount <= 0 ||
      !Number.isSafeInteger(input.amount)
    ) {
      return {
        success: false,
        error: 'El monto del movimiento debe ser un número entero mayor a cero.',
        errorType: 'INVALID_AMOUNT',
      };
    }

    if (!input.reason || !input.reason.trim()) {
      return {
        success: false,
        error: 'El motivo del movimiento es requerido.',
        errorType: 'INVALID_REASON',
      };
    }

    // 1. Verify session is OPEN
    const session = await this.sessionRepo.getById(input.cashSessionId, input.businessId);
    if (!session) {
      return {
        success: false,
        error: 'Sesión de caja no encontrada.',
        errorType: 'CASH_SESSION_NOT_FOUND',
      };
    }

    if (session.status !== 'OPEN') {
      return {
        success: false,
        error: 'No se pueden registrar movimientos en una caja cerrada.',
        errorType: 'CASH_SESSION_ALREADY_CLOSED',
      };
    }

    // 2. Validate non-negative cash drawer for CASH_OUT
    if (input.movementType === 'CASH_OUT') {
      const currentExpected = await this.sessionRepo.getExpectedCashForSession(input.cashSessionId, input.businessId);
      if (currentExpected - input.amount < 0) {
        return {
          success: false,
          error: `No puedes realizar una salida mayor al saldo disponible en caja (Saldo actual: $${currentExpected.toLocaleString('es-ES')}, Salida intentada: $${input.amount.toLocaleString('es-ES')}).`,
          errorType: 'INSUFFICIENT_CASH',
        };
      }
    }

    const now = getCurrentUtcIsoString();
    const movement: CashMovement = {
      id: generateUuid(),
      businessId: input.businessId,
      cashSessionId: input.cashSessionId,
      cashRegisterId: session.cashRegisterId,
      movementType: input.movementType,
      amount: input.amount,
      currencyCode: input.currencyCode || 'CLP',
      reason: input.reason.trim(),
      note: input.note?.trim() || null,
      referenceType: 'USER',
      referenceId: input.createdByUserId,
      createdByUserId: input.createdByUserId,
      createdByNameSnapshot: input.createdByNameSnapshot || 'Cajero',
      createdAt: now,
    };

    try {
      const created = await this.sessionRepo.addMovement(movement);
      return { success: true, movement: created };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Error al registrar movimiento: ${msg}`,
        errorType: 'TRANSACTION_FAILED',
      };
    }
  }
}
