import {
  PurchaseKPIMetrics,
  PurchaseQueryRepository,
} from '../../domain/purchases/repositories/PurchaseQueryRepository';
import { DatabaseManager } from '../database/DatabaseManager';

export class SqlitePurchaseQueryRepository implements PurchaseQueryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: PurchaseQueryRepository
  ) {}

  async getKPIMetrics(businessId: string): Promise<PurchaseKPIMetrics> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getKPIMetrics(businessId);
    }

    const now = new Date();
    const currentYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // 1. Open orders count (DRAFT, ORDERED, PARTIALLY_RECEIVED)
    const openOrdersResult = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM purchase_orders
       WHERE business_id = ? AND status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED')`,
      [businessId]
    );
    const openOrdersCount = openOrdersResult[0]?.count || 0;

    // 2. Pending receipts count (ORDERED, PARTIALLY_RECEIVED)
    const pendingReceiptsResult = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM purchase_orders
       WHERE business_id = ? AND status IN ('ORDERED', 'PARTIALLY_RECEIVED')`,
      [businessId]
    );
    const pendingReceiptsCount = pendingReceiptsResult[0]?.count || 0;

    // 3. Received this month count
    const receivedMonthResult = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM purchase_orders
       WHERE business_id = ? AND status = 'RECEIVED' AND completed_at LIKE ?`,
      [businessId, `${currentYearMonth}%`]
    );
    const receivedThisMonthCount = receivedMonthResult[0]?.count || 0;

    // 4. Purchases total this month (sum of receipt items in current month)
    const purchasesTotalResult = await db.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(ri.line_cost_total), 0) as total
       FROM purchase_receipt_items ri
       JOIN purchase_receipts r ON r.id = ri.purchase_receipt_id
       WHERE ri.business_id = ? AND r.received_at LIKE ?`,
      [businessId, `${currentYearMonth}%`]
    );
    const purchasesTotalThisMonth = purchasesTotalResult[0]?.total || 0;

    return {
      openOrdersCount,
      pendingReceiptsCount,
      receivedThisMonthCount,
      purchasesTotalThisMonth,
    };
  }
}
