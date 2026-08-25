import { DatabaseManager } from '../database/DatabaseManager';
import { CashSessionSummary } from '../../domain/cash/CashSession';
import { CashQueryRepository } from '../../domain/cash/repositories/CashQueryRepository';
import { InMemoryCashQueryRepository } from './InMemoryCashQueryRepository';

interface AggregatedSummaryRow {
  id: string;
  business_id: string;
  cash_register_id: string;
  register_name: string;
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
  total_opening: number;
  total_sale_cash: number;
  total_cash_in: number;
  total_cash_out: number;
  movement_count: number;
  ticket_count: number;
  total_sales_amount: number;
}

export class SqliteCashQueryRepository implements CashQueryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryCashQueryRepository
  ) {}

  async getSessionSummary(sessionId: string, businessId: string): Promise<CashSessionSummary | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getSessionSummary(sessionId, businessId);
    }

    const rows: AggregatedSummaryRow[] = await db.select(
      `SELECT
        cs.*,
        cr.name as register_name,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'OPENING' THEN cm.amount ELSE 0 END), 0) as total_opening,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'SALE_CASH' THEN cm.amount ELSE 0 END), 0) as total_sale_cash,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'CASH_IN' THEN cm.amount ELSE 0 END), 0) as total_cash_in,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'CASH_OUT' THEN cm.amount ELSE 0 END), 0) as total_cash_out,
        COUNT(cm.id) as movement_count,
        (SELECT COUNT(*) FROM sales s WHERE s.cash_session_id = cs.id AND s.business_id = cs.business_id AND s.status = 'COMPLETED') as ticket_count,
        (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.cash_session_id = cs.id AND s.business_id = cs.business_id AND s.status = 'COMPLETED') as total_sales_amount
      FROM cash_sessions cs
      JOIN cash_registers cr ON cr.id = cs.cash_register_id
      LEFT JOIN cash_movements cm ON cm.cash_session_id = cs.id AND cm.business_id = cs.business_id
      WHERE cs.id = ? AND cs.business_id = ?
      GROUP BY cs.id`,
      [sessionId, businessId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    const expectedCash = Number(r.total_opening) + Number(r.total_sale_cash) + Number(r.total_cash_in) - Number(r.total_cash_out);
    const totalSalesAmount = Number(r.total_sales_amount) || 0;
    const totalSaleCash = Number(r.total_sale_cash) || 0;
    const electronicSalesAmount = Math.max(0, totalSalesAmount - totalSaleCash);

    return {
      session: {
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
      },
      registerName: r.register_name || 'Caja principal',
      openingAmount: r.opening_amount,
      totalSaleCash,
      totalCashIn: Number(r.total_cash_in) || 0,
      totalCashOut: Number(r.total_cash_out) || 0,
      expectedCash,
      ticketCount: Number(r.ticket_count) || 0,
      totalSalesAmount,
      electronicSalesAmount,
      movementCount: Number(r.movement_count) || 0,
    };
  }

  async getActiveSessionSummary(businessId: string): Promise<CashSessionSummary | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getActiveSessionSummary(businessId);
    }

    const rows: { id: string }[] = await db.select(
      "SELECT id FROM cash_sessions WHERE business_id = ? AND status = 'OPEN' LIMIT 1",
      [businessId]
    );

    if (rows.length === 0) return null;
    return this.getSessionSummary(rows[0].id, businessId);
  }
}
