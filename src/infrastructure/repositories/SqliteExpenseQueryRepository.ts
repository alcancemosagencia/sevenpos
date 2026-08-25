import {
  ExpenseQueryRepository,
  ListExpensesFilter,
  ListExpensesResult,
} from '../../domain/expenses/repositories/ExpenseQueryRepository';
import {
  OperatingExpenseWithDetails,
  ExpenseKpiSummary,
} from '../../domain/expenses/OperatingExpense';
import { ExpensePaymentMethod } from '../../domain/expenses/ExpensePaymentMethod';
import { CurrencyCode } from '../../types/country';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface ExpenseRow {
  id: string;
  business_id: string;
  expense_number: string;
  expense_sequence: number;
  category_id: string;
  category_name_snapshot: string;
  description: string;
  amount: number;
  currency_code: string;
  payment_method_code: string;
  expense_date: string;
  supplier_id: string | null;
  supplier_name_snapshot: string | null;
  cash_session_id: string | null;
  cash_movement_id: string | null;
  reference_document: string | null;
  note: string | null;
  status: string;
  idempotency_key: string;
  created_by_user_id: string;
  created_by_name_snapshot: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  supplier_name?: string | null;
  cash_register_name?: string | null;
}

export class SqliteExpenseQueryRepository implements ExpenseQueryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: ExpenseQueryRepository
  ) {}

  private mapRow(r: ExpenseRow): OperatingExpenseWithDetails {
    return {
      id: r.id,
      businessId: r.business_id,
      expenseNumber: r.expense_number,
      expenseSequence: r.expense_sequence,
      categoryId: r.category_id,
      categoryNameSnapshot: r.category_name_snapshot,
      categoryName: r.category_name || r.category_name_snapshot,
      description: r.description,
      amount: r.amount,
      currencyCode: r.currency_code as CurrencyCode,
      paymentMethodCode: r.payment_method_code as ExpensePaymentMethod,
      expenseDate: r.expense_date,
      supplierId: r.supplier_id,
      supplierNameSnapshot: r.supplier_name_snapshot,
      supplierName: r.supplier_name || r.supplier_name_snapshot,
      cashSessionId: r.cash_session_id,
      cashMovementId: r.cash_movement_id,
      cashRegisterName: r.cash_register_name || null,
      referenceDocument: r.reference_document,
      note: r.note,
      status: 'RECORDED',
      idempotencyKey: r.idempotency_key,
      createdByUserId: r.created_by_user_id,
      createdByNameSnapshot: r.created_by_name_snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async list(businessId: string, filter?: ListExpensesFilter): Promise<ListExpensesResult> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.list(businessId, filter);

    try {
      const conditions: string[] = ['e.business_id = ?'];
      const params: (string | number)[] = [businessId];

      if (filter?.startDate) {
        conditions.push('e.expense_date >= ?');
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        conditions.push('e.expense_date <= ?');
        params.push(filter.endDate);
      }
      if (filter?.categoryId) {
        conditions.push('e.category_id = ?');
        params.push(filter.categoryId);
      }
      if (filter?.paymentMethodCode) {
        conditions.push('e.payment_method_code = ?');
        params.push(filter.paymentMethodCode);
      }
      if (filter?.supplierId) {
        conditions.push('e.supplier_id = ?');
        params.push(filter.supplierId);
      }
      if (filter?.search && filter.search.trim().length > 0) {
        const queryPattern = `%${filter.search.trim()}%`;
        conditions.push(
          '(e.description LIKE ? OR e.expense_number LIKE ? OR e.category_name_snapshot LIKE ? OR e.supplier_name_snapshot LIKE ? OR e.reference_document LIKE ?)'
        );
        params.push(queryPattern, queryPattern, queryPattern, queryPattern, queryPattern);
      }

      const whereClause = conditions.join(' AND ');

      // Total count query
      const countResult: { total: number }[] = await db.select(
        `SELECT COUNT(*) as total FROM operating_expenses e WHERE ${whereClause}`,
        params
      );
      const totalCount = countResult[0]?.total || 0;

      // Data query with joins
      const limit = filter?.limit !== undefined ? filter.limit : 50;
      const offset = filter?.offset || 0;

      const dataParams = [...params, limit, offset];
      const rows: ExpenseRow[] = await db.select(
        `SELECT e.*, c.name as category_name, s.name as supplier_name, cr.name as cash_register_name
         FROM operating_expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         LEFT JOIN cash_sessions cs ON e.cash_session_id = cs.id
         LEFT JOIN cash_registers cr ON cs.cash_register_id = cr.id
         WHERE ${whereClause}
         ORDER BY e.expense_date DESC, e.expense_sequence DESC
         LIMIT ? OFFSET ?`,
        dataParams
      );

      return {
        expenses: rows.map((r) => this.mapRow(r)),
        totalCount,
      };
    } catch (err) {
      logger.error('SqliteExpenseQueryRepository', 'Error in list', { error: String(err) });
      return this.fallbackRepo.list(businessId, filter);
    }
  }

  async getKpiSummary(businessId: string, todayDate: string, monthPrefix: string): Promise<ExpenseKpiSummary> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getKpiSummary(businessId, todayDate, monthPrefix);

    try {
      const rows: {
        today_total: number;
        month_total: number;
        cash_paid_total: number;
        expenses_count: number;
      }[] = await db.select(
        `SELECT
          COALESCE(SUM(CASE WHEN expense_date = ? THEN amount ELSE 0 END), 0) AS today_total,
          COALESCE(SUM(CASE WHEN expense_date LIKE ? || '%' THEN amount ELSE 0 END), 0) AS month_total,
          COALESCE(SUM(CASE WHEN expense_date LIKE ? || '%' AND payment_method_code = 'CASH' THEN amount ELSE 0 END), 0) AS cash_paid_total,
          COALESCE(COUNT(CASE WHEN expense_date LIKE ? || '%' THEN 1 ELSE NULL END), 0) AS expenses_count
         FROM operating_expenses
         WHERE business_id = ?`,
        [todayDate, monthPrefix, monthPrefix, monthPrefix, businessId]
      );

      if (rows.length === 0) {
        return {
          todayTotal: 0,
          monthTotal: 0,
          cashPaidTotal: 0,
          expensesCount: 0,
        };
      }

      return {
        todayTotal: rows[0].today_total,
        monthTotal: rows[0].month_total,
        cashPaidTotal: rows[0].cash_paid_total,
        expensesCount: rows[0].expenses_count,
      };
    } catch (err) {
      logger.error('SqliteExpenseQueryRepository', 'Error in getKpiSummary', { error: String(err) });
      return this.fallbackRepo.getKpiSummary(businessId, todayDate, monthPrefix);
    }
  }
}
