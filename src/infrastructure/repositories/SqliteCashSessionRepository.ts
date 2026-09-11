import { DatabaseManager } from '../database/DatabaseManager';
import { CashSession } from '../../domain/cash/CashSession';
import { CashMovement, CashMovementType, CashMovementReferenceType } from '../../domain/cash/CashMovement';
import {
  CashSessionRepository,
  OpenSessionParams,
  CloseSessionParams,
} from '../../domain/cash/repositories/CashSessionRepository';
import { InMemoryCashSessionRepository } from './InMemoryCashSessionRepository';
import { logger } from '../logging/Logger';
import { CurrencyCode } from '../../types/country';
import { insertAuditRowInTransaction } from '../../application/audit/auditEventHelper';

interface CashSessionRow {
  id: string;
  business_id: string;
  cash_register_id: string;
  opened_by_user_id: string;
  opened_by_name_snapshot: string;
  opened_at: string;
  opening_amount: number;
  status: string;
  closed_by_user_id: string | null;
  closed_by_name_snapshot: string | null;
  closed_at: string | null;
  expected_cash_amount: number | null;
  counted_cash_amount: number | null;
  difference_amount: number | null;
  closing_note: string | null;
  created_at: string;
  updated_at: string;
}

interface CashMovementRow {
  id: string;
  business_id: string;
  cash_session_id: string;
  cash_register_id: string;
  movement_type: string;
  amount: number;
  currency_code: string;
  reason: string;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by_user_id: string;
  created_by_name_snapshot: string;
  created_at: string;
}

export class SqliteCashSessionRepository implements CashSessionRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryCashSessionRepository
  ) {}

  private sessionRowToEntity(r: CashSessionRow): CashSession {
    return {
      id: r.id,
      businessId: r.business_id,
      cashRegisterId: r.cash_register_id,
      openedByUserId: r.opened_by_user_id,
      openedByNameSnapshot: r.opened_by_name_snapshot,
      openedAt: r.opened_at,
      openingAmount: r.opening_amount,
      status: r.status as import('../../domain/cash/CashSession').CashSessionStatus,
      closedByUserId: r.closed_by_user_id,
      closedByNameSnapshot: r.closed_by_name_snapshot,
      closedAt: r.closed_at,
      expectedCashAmount: r.expected_cash_amount,
      countedCashAmount: r.counted_cash_amount,
      differenceAmount: r.difference_amount,
      closingNote: r.closing_note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private movementRowToEntity(r: CashMovementRow): CashMovement {
    return {
      id: r.id,
      businessId: r.business_id,
      cashSessionId: r.cash_session_id,
      cashRegisterId: r.cash_register_id,
      movementType: r.movement_type as CashMovementType,
      amount: r.amount,
      currencyCode: r.currency_code as CurrencyCode,
      reason: r.reason,
      note: r.note,
      referenceType: r.reference_type as CashMovementReferenceType | null,
      referenceId: r.reference_id,
      createdByUserId: r.created_by_user_id,
      createdByNameSnapshot: r.created_by_name_snapshot,
      createdAt: r.created_at,
    };
  }

  async getActiveSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getActiveSession(businessId, cashRegisterId);
    }
    const query = cashRegisterId
      ? "SELECT * FROM cash_sessions WHERE business_id = ? AND cash_register_id = ? AND status = 'OPEN' LIMIT 1"
      : "SELECT * FROM cash_sessions WHERE business_id = ? AND status = 'OPEN' LIMIT 1";
    const params = cashRegisterId ? [businessId, cashRegisterId] : [businessId];

    const rows: CashSessionRow[] = await db.select(query, params);
    return rows.length > 0 ? this.sessionRowToEntity(rows[0]) : null;
  }

  async getById(id: string, businessId: string): Promise<CashSession | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getById(id, businessId);
    }
    const rows: CashSessionRow[] = await db.select(
      'SELECT * FROM cash_sessions WHERE id = ? AND business_id = ?',
      [id, businessId]
    );
    return rows.length > 0 ? this.sessionRowToEntity(rows[0]) : null;
  }

  async getLastSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getLastSession(businessId, cashRegisterId);
    }
    const query = cashRegisterId
      ? 'SELECT * FROM cash_sessions WHERE business_id = ? AND cash_register_id = ? ORDER BY opened_at DESC LIMIT 1'
      : 'SELECT * FROM cash_sessions WHERE business_id = ? ORDER BY opened_at DESC LIMIT 1';
    const params = cashRegisterId ? [businessId, cashRegisterId] : [businessId];

    const rows: CashSessionRow[] = await db.select(query, params);
    return rows.length > 0 ? this.sessionRowToEntity(rows[0]) : null;
  }

  async listSessions(
    businessId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ sessions: CashSession[]; total: number }> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listSessions(businessId, limit, offset);
    }

    const countRows: { count: number }[] = await db.select(
      'SELECT COUNT(*) as count FROM cash_sessions WHERE business_id = ?',
      [businessId]
    );
    const total = countRows[0]?.count || 0;

    const rows: CashSessionRow[] = await db.select(
      'SELECT * FROM cash_sessions WHERE business_id = ? ORDER BY opened_at DESC LIMIT ? OFFSET ?',
      [businessId, limit, offset]
    );

    return {
      sessions: rows.map(this.sessionRowToEntity),
      total,
    };
  }

  async openSession(params: OpenSessionParams): Promise<CashSession> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.openSession(params);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      // 1. Double check active session
      const existing: CashSessionRow[] = await db.select(
        "SELECT id FROM cash_sessions WHERE business_id = ? AND cash_register_id = ? AND status = 'OPEN'",
        [params.session.businessId, params.session.cashRegisterId]
      );
      if (existing.length > 0) {
        throw new Error('uq_active_cash_session_per_register: Ya existe una sesión de caja abierta.');
      }

      // 2. Insert into cash_sessions
      await db.execute(
        `INSERT INTO cash_sessions (
          id, business_id, cash_register_id, opened_by_user_id, opened_by_name_snapshot,
          opened_at, opening_amount, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.session.id,
          params.session.businessId,
          params.session.cashRegisterId,
          params.session.openedByUserId,
          params.session.openedByNameSnapshot,
          params.session.openedAt,
          params.session.openingAmount,
          params.session.status,
          params.session.createdAt,
          params.session.updatedAt,
        ]
      );

      // 3. Insert into cash_movements (OPENING)
      await db.execute(
        `INSERT INTO cash_movements (
          id, business_id, cash_session_id, cash_register_id, movement_type,
          amount, currency_code, reason, note, reference_type, reference_id,
          created_by_user_id, created_by_name_snapshot, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.initialMovement.id,
          params.initialMovement.businessId,
          params.initialMovement.cashSessionId,
          params.initialMovement.cashRegisterId,
          params.initialMovement.movementType,
          params.initialMovement.amount,
          params.initialMovement.currencyCode,
          params.initialMovement.reason,
          params.initialMovement.note || null,
          params.initialMovement.referenceType || null,
          params.initialMovement.referenceId || null,
          params.initialMovement.createdByUserId,
          params.initialMovement.createdByNameSnapshot,
          params.initialMovement.createdAt,
        ]
      );

      // 4. In-transaction Audit Event: Shift Opened
      await insertAuditRowInTransaction(db, {
        businessId: params.session.businessId,
        eventCategory: 'CASH',
        eventType: 'cash.shift.opened',
        action: 'OPEN_SHIFT',
        severity: 'INFO',
        actorUserId: params.session.openedByUserId,
        actorNameSnapshot: params.session.openedByNameSnapshot,
        entityType: 'CASH_SESSION',
        entityId: params.session.id,
        summary: `Apertura de turno de caja (monto inicial: $${params.session.openingAmount.toLocaleString('es-CL')})`,
        metadata: {
          openingAmount: params.session.openingAmount,
          cashRegisterId: params.session.cashRegisterId,
        },
      });

      await db.execute('COMMIT');
      return { ...params.session };
    } catch (err) {
      try {
        await db.execute('ROLLBACK');
      } catch (rbErr) {
        logger.error('SqliteCashSessionRepository', 'Error rolling back openSession', { error: String(rbErr) });
      }
      throw err;
    }
  }

  async closeSession(params: CloseSessionParams): Promise<CashSession> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.closeSession(params);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      const existing: CashSessionRow[] = await db.select(
        'SELECT * FROM cash_sessions WHERE id = ? AND business_id = ?',
        [params.sessionId, params.businessId]
      );

      if (existing.length === 0) {
        throw new Error('Sesión de caja no encontrada.');
      }
      if (existing[0].status !== 'OPEN') {
        throw new Error('La sesión de caja ya se encuentra cerrada.');
      }

      await db.execute(
        `UPDATE cash_sessions SET
          status = 'CLOSED',
          closed_by_user_id = ?,
          closed_by_name_snapshot = ?,
          closed_at = ?,
          expected_cash_amount = ?,
          counted_cash_amount = ?,
          difference_amount = ?,
          closing_note = ?,
          updated_at = ?
        WHERE id = ? AND business_id = ?`,
        [
          params.closedByUserId,
          params.closedByNameSnapshot,
          params.closedAt,
          params.expectedCashAmount,
          params.countedCashAmount,
          params.differenceAmount,
          params.closingNote || null,
          params.closedAt,
          params.sessionId,
          params.businessId,
        ]
      );

      // In-transaction Audit Event: Shift Closed
      await insertAuditRowInTransaction(db, {
        businessId: params.businessId,
        eventCategory: 'CASH',
        eventType: 'cash.shift.closed',
        action: 'CLOSE_SHIFT',
        severity: 'INFO',
        actorUserId: params.closedByUserId,
        actorNameSnapshot: params.closedByNameSnapshot,
        entityType: 'CASH_SESSION',
        entityId: params.sessionId,
        summary: `Cierre de turno de caja (esperado: $${params.expectedCashAmount.toLocaleString('es-CL')}, contado: $${params.countedCashAmount.toLocaleString('es-CL')})`,
        metadata: {
          expectedCashAmount: params.expectedCashAmount,
          countedCashAmount: params.countedCashAmount,
          differenceAmount: params.differenceAmount,
          closingNote: params.closingNote || null,
        },
      });

      // In-transaction Audit Event: Discrepancy Detected (if difference != 0)
      if (params.differenceAmount !== 0) {
        await insertAuditRowInTransaction(db, {
          businessId: params.businessId,
          eventCategory: 'CASH',
          eventType: 'cash.discrepancy.detected',
          action: 'DISCREPANCY',
          severity: 'WARNING',
          actorUserId: params.closedByUserId,
          actorNameSnapshot: params.closedByNameSnapshot,
          entityType: 'CASH_SESSION',
          entityId: params.sessionId,
          summary: `Diferencia de caja detectada en cierre: $${params.differenceAmount.toLocaleString('es-CL')}`,
          metadata: {
            expectedCashAmount: params.expectedCashAmount,
            countedCashAmount: params.countedCashAmount,
            differenceAmount: params.differenceAmount,
          },
        });
      }

      await db.execute('COMMIT');

      const updatedRows: CashSessionRow[] = await db.select(
        'SELECT * FROM cash_sessions WHERE id = ? AND business_id = ?',
        [params.sessionId, params.businessId]
      );
      return this.sessionRowToEntity(updatedRows[0]);
    } catch (err) {
      try {
        await db.execute('ROLLBACK');
      } catch (rbErr) {
        logger.error('SqliteCashSessionRepository', 'Error rolling back closeSession', { error: String(rbErr) });
      }
      throw err;
    }
  }

  async addMovement(movement: CashMovement): Promise<CashMovement> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.addMovement(movement);
    }

    await db.execute(
      `INSERT INTO cash_movements (
        id, business_id, cash_session_id, cash_register_id, movement_type,
        amount, currency_code, reason, note, reference_type, reference_id,
        created_by_user_id, created_by_name_snapshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movement.id,
        movement.businessId,
        movement.cashSessionId,
        movement.cashRegisterId,
        movement.movementType,
        movement.amount,
        movement.currencyCode,
        movement.reason,
        movement.note || null,
        movement.referenceType || null,
        movement.referenceId || null,
        movement.createdByUserId,
        movement.createdByNameSnapshot,
        movement.createdAt,
      ]
    );

    if (movement.movementType === 'CASH_IN' || movement.movementType === 'CASH_OUT') {
      insertAuditRowInTransaction(db, {
        businessId: movement.businessId,
        eventCategory: 'CASH',
        eventType: 'cash.movement.created',
        action: movement.movementType,
        severity: 'INFO',
        actorUserId: movement.createdByUserId,
        actorNameSnapshot: movement.createdByNameSnapshot,
        entityType: 'CASH_MOVEMENT',
        entityId: movement.id,
        summary: `Movimiento de caja manual (${movement.movementType}): $${movement.amount.toLocaleString('es-CL')} - ${movement.reason}`,
        metadata: {
          movementType: movement.movementType,
          amount: movement.amount,
          reason: movement.reason,
          cashSessionId: movement.cashSessionId,
        },
      }).catch(() => {});
    }

    return { ...movement };
  }

  async listMovementsBySession(sessionId: string, businessId: string): Promise<CashMovement[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listMovementsBySession(sessionId, businessId);
    }

    const rows: CashMovementRow[] = await db.select(
      'SELECT * FROM cash_movements WHERE cash_session_id = ? AND business_id = ? ORDER BY created_at DESC',
      [sessionId, businessId]
    );

    return rows.map(this.movementRowToEntity);
  }

  async getExpectedCashForSession(sessionId: string, businessId: string): Promise<number> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getExpectedCashForSession(sessionId, businessId);
    }

    const rows: { expected_cash: number }[] = await db.select(
      `SELECT COALESCE(SUM(
        CASE
          WHEN movement_type = 'OPENING' THEN amount
          WHEN movement_type = 'SALE_CASH' THEN amount
          WHEN movement_type = 'CASH_IN' THEN amount
          WHEN movement_type = 'CASH_OUT' THEN -amount
          ELSE 0
        END
      ), 0) as expected_cash
      FROM cash_movements
      WHERE cash_session_id = ? AND business_id = ?`,
      [sessionId, businessId]
    );

    return rows[0]?.expected_cash || 0;
  }
}
