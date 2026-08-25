import { CashSession } from '../../domain/cash/CashSession';
import { CashMovement } from '../../domain/cash/CashMovement';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { CurrencyCode } from '../../types/country';

export interface OpenCashSessionInput {
  businessId: string;
  cashRegisterId?: string;
  openedByUserId: string;
  openedByNameSnapshot: string;
  openingAmount: number; // Stored in minor currency units (e.g. 20000 for $20.000)
  currencyCode?: CurrencyCode;
  note?: string | null;
}

export type OpenCashSessionErrorType =
  | 'CASH_SESSION_ALREADY_OPEN'
  | 'INVALID_OPENING_AMOUNT'
  | 'CASH_REGISTER_NOT_FOUND'
  | 'TRANSACTION_FAILED';

export interface OpenCashSessionResult {
  success: boolean;
  session?: CashSession;
  error?: string;
  errorType?: OpenCashSessionErrorType;
}

export class OpenCashSession {
  constructor(
    private sessionRepo: CashSessionRepository,
    private registerRepo: CashRegisterRepository
  ) {}

  async execute(input: OpenCashSessionInput): Promise<OpenCashSessionResult> {
    if (!input.businessId) {
      return { success: false, error: 'businessId es requerido.', errorType: 'TRANSACTION_FAILED' };
    }
    if (!input.openedByUserId) {
      return { success: false, error: 'Usuario no identificado.', errorType: 'TRANSACTION_FAILED' };
    }

    if (
      typeof input.openingAmount !== 'number' ||
      !Number.isInteger(input.openingAmount) ||
      input.openingAmount < 0 ||
      !Number.isSafeInteger(input.openingAmount)
    ) {
      return {
        success: false,
        error: 'El monto de apertura debe ser un número entero mayor o igual a cero.',
        errorType: 'INVALID_OPENING_AMOUNT',
      };
    }

    // 1. Resolve or ensure Cash Register
    let registerId = input.cashRegisterId;
    if (!registerId) {
      const defaultReg = await this.registerRepo.ensureDefaultRegister(input.businessId);
      registerId = defaultReg.id;
    } else {
      const reg = await this.registerRepo.getById(registerId, input.businessId);
      if (!reg || !reg.active) {
        return {
          success: false,
          error: 'La caja seleccionada no existe o está inactiva.',
          errorType: 'CASH_REGISTER_NOT_FOUND',
        };
      }
    }

    // 2. Prevent double opening (Check DB state before transaction)
    const active = await this.sessionRepo.getActiveSession(input.businessId, registerId);
    if (active) {
      return {
        success: false,
        error: 'Ya existe una sesión de caja abierta para esta caja.',
        errorType: 'CASH_SESSION_ALREADY_OPEN',
      };
    }

    const now = getCurrentUtcIsoString();
    const sessionId = generateUuid();
    const currency = input.currencyCode || 'CLP';

    const session: CashSession = {
      id: sessionId,
      businessId: input.businessId,
      cashRegisterId: registerId,
      openedByUserId: input.openedByUserId,
      openedByNameSnapshot: input.openedByNameSnapshot || 'Cajero',
      openedAt: now,
      openingAmount: input.openingAmount,
      status: 'OPEN',
      closedByUserId: null,
      closedByNameSnapshot: null,
      closedAt: null,
      expectedCashAmount: null,
      countedCashAmount: null,
      differenceAmount: null,
      closingNote: null,
      createdAt: now,
      updatedAt: now,
    };

    const initialMovement: CashMovement = {
      id: generateUuid(),
      businessId: input.businessId,
      cashSessionId: sessionId,
      cashRegisterId: registerId,
      movementType: 'OPENING',
      amount: input.openingAmount,
      currencyCode: currency,
      reason: 'Fondo inicial de apertura',
      note: input.note || null,
      referenceType: 'SESSION',
      referenceId: sessionId,
      createdByUserId: input.openedByUserId,
      createdByNameSnapshot: input.openedByNameSnapshot || 'Cajero',
      createdAt: now,
    };

    try {
      const created = await this.sessionRepo.openSession({ session, initialMovement });
      return { success: true, session: created };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('uq_active_cash_session_per_register') || msg.includes('ALREADY_OPEN')) {
        return {
          success: false,
          error: 'Ya existe una sesión de caja abierta.',
          errorType: 'CASH_SESSION_ALREADY_OPEN',
        };
      }
      return {
        success: false,
        error: `Error al abrir la caja: ${msg}`,
        errorType: 'TRANSACTION_FAILED',
      };
    }
  }
}
