import { CustomerWithStats, CustomerMetrics } from '../../domain/customers/Customer';
import {
  CustomerQueryRepository,
  CustomerSalesHistoryOptions,
} from '../../domain/customers/repositories/CustomerQueryRepository';
import { Sale } from '../../domain/sales/Sale';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface AggregatedCustomerRow {
  id: string;
  business_id: string;
  name: string;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
  sales_count: number;
  total_spent: number;
  last_purchase_at: string | null;
}

interface SaleRow {
  id: string;
  business_id: string;
  sale_number: string;
  sale_sequence: number;
  status: 'COMPLETED' | 'VOIDED';
  customer_id: string | null;
  customer_name_snapshot: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  currency_code: string;
  note: string | null;
  idempotency_key: string;
  created_by_user_id: string;
  created_by_name_snapshot: string;
  created_at: string;
  completed_at: string;
}

export class SqliteCustomerQueryRepository implements CustomerQueryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: CustomerQueryRepository
  ) {}

  private rowToCustomerWithStats(r: AggregatedCustomerRow): CustomerWithStats {
    const salesCount = r.sales_count || 0;
    const totalSpent = r.total_spent || 0;
    const averageTicket = salesCount > 0 ? Math.round(totalSpent / salesCount) : 0;

    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      lastName: r.last_name,
      documentType: r.document_type,
      documentNumber: r.document_number,
      phone: r.phone,
      email: r.email,
      address: r.address,
      notes: r.notes,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      salesCount,
      totalSpent,
      lastPurchaseAt: r.last_purchase_at,
      averageTicket,
    };
  }

  private saleRowToEntity(r: SaleRow): Sale {
    return {
      id: r.id,
      businessId: r.business_id,
      saleNumber: r.sale_number,
      saleSequence: r.sale_sequence,
      status: r.status,
      customerId: r.customer_id,
      customerNameSnapshot: r.customer_name_snapshot,
      subtotal: r.subtotal,
      discountTotal: r.discount_total,
      taxTotal: r.tax_total,
      total: r.total,
      currencyCode: r.currency_code,
      note: r.note,
      idempotencyKey: r.idempotency_key,
      createdByUserId: r.created_by_user_id,
      createdByNameSnapshot: r.created_by_name_snapshot,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    };
  }

  async getKPIMetrics(businessId: string): Promise<CustomerMetrics> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getKPIMetrics(businessId);

    try {
      // 1. Active customers count
      const activeRows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM customers WHERE business_id = ? AND active = 1',
        [businessId]
      );
      const activeCustomersCount = activeRows[0]?.count || 0;

      // 2. New customers this month (using local date year-month prefix)
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const newRows = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM customers WHERE business_id = ? AND created_at LIKE ? || '%'",
        [businessId, currentYearMonth]
      );
      const newCustomersThisMonthCount = newRows[0]?.count || 0;

      // 3. Customers with completed purchases (excluding null customer_id)
      const customersWithPurchasesRows = await db.select<{ count: number }[]>(
        `SELECT COUNT(DISTINCT customer_id) as count
         FROM sales
         WHERE business_id = ? AND customer_id IS NOT NULL AND status = 'COMPLETED'`,
        [businessId]
      );
      const customersWithPurchasesCount = customersWithPurchasesRows[0]?.count || 0;

      // 4. Global average ticket per customer (with completed sales)
      const salesAggregate = await db.select<{ total_spent: number; total_sales: number }[]>(
        `SELECT COALESCE(SUM(total), 0) as total_spent, COUNT(id) as total_sales
         FROM sales
         WHERE business_id = ? AND customer_id IS NOT NULL AND status = 'COMPLETED'`,
        [businessId]
      );
      const totalSpentAll = salesAggregate[0]?.total_spent || 0;
      const totalSalesAll = salesAggregate[0]?.total_sales || 0;
      const globalAverageTicketPerCustomer =
        totalSalesAll > 0 ? Math.round(totalSpentAll / totalSalesAll) : 0;

      return {
        activeCustomersCount,
        newCustomersThisMonthCount,
        customersWithPurchasesCount,
        globalAverageTicketPerCustomer,
      };
    } catch (err) {
      logger.error('SqliteCustomerQueryRepository', 'Failed to calculate KPI metrics', {
        error: String(err),
      });
      return {
        activeCustomersCount: 0,
        newCustomersThisMonthCount: 0,
        customersWithPurchasesCount: 0,
        globalAverageTicketPerCustomer: 0,
      };
    }
  }

  async listWithStats(
    businessId: string,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<CustomerWithStats[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.listWithStats(businessId, search, limit, offset);

    let sql = `
      SELECT 
        c.*,
        COALESCE(COUNT(s.id), 0) AS sales_count,
        COALESCE(SUM(s.total), 0) AS total_spent,
        MAX(s.completed_at) AS last_purchase_at
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.business_id = c.business_id AND s.status = 'COMPLETED'
      WHERE c.business_id = ?
    `;
    const params: (string | number)[] = [businessId];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (c.name LIKE ? OR c.last_name LIKE ? OR c.document_number LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ' GROUP BY c.id ORDER BY c.active DESC, c.name ASC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    const rows = await db.select<AggregatedCustomerRow[]>(sql, params);
    return rows.map((r) => this.rowToCustomerWithStats(r));
  }

  async getCustomerStats(businessId: string, customerId: string): Promise<CustomerWithStats | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getCustomerStats(businessId, customerId);

    const sql = `
      SELECT 
        c.*,
        COALESCE(COUNT(s.id), 0) AS sales_count,
        COALESCE(SUM(s.total), 0) AS total_spent,
        MAX(s.completed_at) AS last_purchase_at
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.business_id = c.business_id AND s.status = 'COMPLETED'
      WHERE c.business_id = ? AND c.id = ?
      GROUP BY c.id
    `;
    const rows = await db.select<AggregatedCustomerRow[]>(sql, [businessId, customerId]);
    if (rows.length === 0) return null;
    return this.rowToCustomerWithStats(rows[0]);
  }

  async getCustomerSalesHistory(
    businessId: string,
    customerId: string,
    options?: CustomerSalesHistoryOptions
  ): Promise<Sale[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getCustomerSalesHistory(businessId, customerId, options);

    let sql = `
      SELECT * FROM sales
      WHERE business_id = ? AND customer_id = ?
      ORDER BY completed_at DESC
    `;
    const params: (string | number)[] = [businessId, customerId];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await db.select<SaleRow[]>(sql, params);
    return rows.map((r) => this.saleRowToEntity(r));
  }

  async getRecentCustomers(businessId: string, limit: number = 5): Promise<CustomerWithStats[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getRecentCustomers(businessId, limit);

    const sql = `
      SELECT 
        c.*,
        COALESCE(COUNT(s.id), 0) AS sales_count,
        COALESCE(SUM(s.total), 0) AS total_spent,
        MAX(s.completed_at) AS last_purchase_at
      FROM customers c
      INNER JOIN sales s ON s.customer_id = c.id AND s.business_id = c.business_id AND s.status = 'COMPLETED'
      WHERE c.business_id = ? AND c.active = 1
      GROUP BY c.id
      ORDER BY MAX(s.completed_at) DESC
      LIMIT ?
    `;
    const rows = await db.select<AggregatedCustomerRow[]>(sql, [businessId, limit]);
    return rows.map((r) => this.rowToCustomerWithStats(r));
  }
}
