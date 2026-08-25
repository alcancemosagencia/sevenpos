import { CashSession } from '../../domain/cash/CashSession';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { calculateCashDifference } from '../../domain/cash/CashSessionMath';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

export interface CloseCashSessionInput {
  sessionId: string;
  businessId: string;
  closedByUserId: string;
  closedByNameSnapshot: string;
  countedCashAmount: number; // Stored in minor units (e.g. 26000 for $26.000)
  previewExpectedCash?: number | null; // Value shown in step 2 preview for concurrency validation
  closingNote?: string | null;
}

export type CloseCashSessionErrorType =
  | 'CASH_SESSION_NOT_FOUND'
  | 'CASH_SESSION_ALREADY_CLOSED'
  | 'INVALID_COUNTED_AMOUNT'
  | 'CASH_SESSION_CHANGED'
  | 'TRANSACTION_FAILED';

export interface CloseCashSessionResult {
  success: boolean;
  session?: CashSession;
  expectedCashAmount?: number;
  differenceAmount?: number;
  error?: string;
  errorType?: CloseCashSessionErrorType;
}

export class CloseCashSession {
  constructor(private sessionRepo: CashSessionRepository) {}

  async execute(input: CloseCashSessionInput): Promise<CloseCashSessionResult> {
    if (!input.businessId || !input.sessionId) {
      return { success: false, error: 'businessId y sessionId son requeridos.', errorType: 'TRANSACTION_FAILED' };
    }

    if (
      typeof input.countedCashAmount !== 'number' ||
      !Number.isInteger(input.countedCashAmount) ||
      input.countedCashAmount < 0 ||
      !Number.isSafeInteger(input.countedCashAmount)
    ) {
      return {
        success: false,
        error: 'El monto contado debe ser un número entero mayor o igual a cero.',
        errorType: 'INVALID_COUNTED_AMOUNT',
      };
    }

    // 1. Verify session exists & is open
    const session = await this.sessionRepo.getById(input.sessionId, input.businessId);
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
        error: 'La sesión de caja ya se encuentra cerrada.',
        errorType: 'CASH_SESSION_ALREADY_CLOSED',
      };
    }

    // 2. Authoritative expected cash re-computation from movements ledger
    const expectedCash = await this.sessionRepo.getExpectedCashForSession(input.sessionId, input.businessId);

    // 3. Concurrency check: If previewExpectedCash was provided and doesn't match, warn user
    if (
      typeof input.previewExpectedCash === 'number' &&
      input.previewExpectedCash !== expectedCash
    ) {
      return {
        success: false,
        expectedCashAmount: expectedCash,
        error: 'El saldo esperado de la caja cambió debido a movimientos recientes. Por favor confirma el nuevo arqueo.',
        errorType: 'CASH_SESSION_CHANGED',
      };
    }

    // 4. Calculate difference: difference = counted - expected
    const difference = calculateCashDifference(input.countedCashAmount, expectedCash);
    const now = getCurrentUtcIsoString();

    try {
      const closed = await this.sessionRepo.closeSession({
        sessionId: input.sessionId,
        businessId: input.businessId,
        closedByUserId: input.closedByUserId,
        closedByNameSnapshot: input.closedByNameSnapshot || 'Cajero',
        closedAt: now,
        expectedCashAmount: expectedCash,
        countedCashAmount: input.countedCashAmount,
        differenceAmount: difference,
        closingNote: input.closingNote || null,
      });

      return {
        success: true,
        session: closed,
        expectedCashAmount: expectedCash,
        differenceAmount: difference,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Error al cerrar la caja: ${msg}`,
        errorType: 'TRANSACTION_FAILED',
      };
    }
  }
}
