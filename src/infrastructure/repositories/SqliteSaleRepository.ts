import { Sale, SaleWithDetails } from '../../domain/sales/Sale';
import { SaleItem } from '../../domain/sales/SaleItem';
import { SalePayment } from '../../domain/sales/SalePayment';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { SaleRepository, ListSalesOptions } from '../../domain/sales/repositories/SaleRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface SaleRow {
  id: string;
  business_id: string;
  sale_number: string;
  sale_sequence: number;
  status: string;
  customer_id: string | null;
  cash_session_id?: string | null;
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

interface SaleItemRow {
  id: string;
  business_id: string;
  sale_id: string;
  product_id: string;
  presentation_id: string | null;
  product_name_snapshot: string;
  presentation_name_snapshot: string | null;
  base_unit: string;
  presentation_factor: number;
  quantity: number;
  inventory_quantity_delta: number;
  unit_price: number;
  discount_total: number;
  line_total: number;
  unit_cost_snapshot: number | null;
  line_cost_total: number | null;
  cost_quality_snapshot: string;
  sku_snapshot: string | null;
  barcode_snapshot: string | null;
  created_at: string;
}

interface SalePaymentRow {
  id: string;
  business_id: string;
  sale_id: string;
  payment_method_id: string;
  payment_method_code: string;
  payment_method_name_snapshot: string;
  amount: number;
  currency_code: string;
  received_amount: number | null;
  change_amount: number | null;
  created_at: string;
}

export class SqliteSaleRepository implements SaleRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: SaleRepository
  ) {}

  private saleRowToEntity(r: SaleRow): Sale {
    return {
      id: r.id,
      businessId: r.business_id,
      saleNumber: r.sale_number,
      saleSequence: r.sale_sequence,
      status: r.status as import('../../domain/sales/Sale').SaleStatus,
      customerId: r.customer_id,
      cashSessionId: r.cash_session_id || null,
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

  private itemRowToEntity(r: SaleItemRow): SaleItem {
    return {
      id: r.id,
      businessId: r.business_id,
      saleId: r.sale_id,
      productId: r.product_id,
      presentationId: r.presentation_id,
      productNameSnapshot: r.product_name_snapshot,
      presentationNameSnapshot: r.presentation_name_snapshot,
      baseUnit: r.base_unit as import('../../domain/common/unit/BaseUnit').BaseUnitCode,
      presentationFactor: r.presentation_factor,
      quantity: r.quantity,
      inventoryQuantityDelta: r.inventory_quantity_delta,
      unitPrice: r.unit_price,
      discountTotal: r.discount_total,
      lineTotal: r.line_total,
      unitCostSnapshot: r.unit_cost_snapshot,
      lineCostTotal: r.line_cost_total,
      costQualitySnapshot: r.cost_quality_snapshot as import('../../domain/sales/SaleItem').CostQualitySnapshot,
      skuSnapshot: r.sku_snapshot,
      barcodeSnapshot: r.barcode_snapshot,
      createdAt: r.created_at,
    };
  }

  private paymentRowToEntity(r: SalePaymentRow): SalePayment {
    return {
      id: r.id,
      businessId: r.business_id,
      saleId: r.sale_id,
      paymentMethodId: r.payment_method_id,
      paymentMethodCode: r.payment_method_code as import('../../domain/sales/PaymentMethod').PaymentMethodCode,
      paymentMethodNameSnapshot: r.payment_method_name_snapshot,
      amount: r.amount,
      currencyCode: r.currency_code,
      receivedAmount: r.received_amount,
      changeAmount: r.change_amount,
      createdAt: r.created_at,
    };
  }

  async createSaleTransaction(
    sale: Sale,
    items: SaleItem[],
    payments: SalePayment[],
    movements: InventoryMovement[],
    cashMovement?: import('../../domain/cash/CashMovement').CashMovement | null
  ): Promise<SaleWithDetails> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.createSaleTransaction(sale, items, payments, movements, cashMovement);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      // 0. Authoritative in-transaction check for Active Cash Session
      if (sale.cashSessionId) {
        const sessionRows: { id: string; status: string }[] = await db.select(
          'SELECT id, status FROM cash_sessions WHERE id = ? AND business_id = ?',
          [sale.cashSessionId, sale.businessId]
        );
        if (sessionRows.length === 0 || sessionRows[0].status !== 'OPEN') {
          throw new Error('CASH_SESSION_REQUIRED: La caja no se encuentra abierta.');
        }
      }

      // 0b. Authoritative in-transaction check & snapshot derivation for Customer
      let finalCustomerId: string | null = null;
      let finalCustomerNameSnapshot: string = 'Consumidor final';

      if (sale.customerId) {
        const customerRows: { id: string; name: string; last_name: string | null; active: number }[] =
          await db.select(
            'SELECT id, name, last_name, active FROM customers WHERE id = ? AND business_id = ?',
            [sale.customerId, sale.businessId]
          );

        if (customerRows.length === 0) {
          throw new Error('CUSTOMER_NOT_FOUND: El cliente seleccionado no existe en este negocio.');
        }

        const cRow = customerRows[0];
        if (cRow.active !== 1) {
          throw new Error('CUSTOMER_INACTIVE: El cliente seleccionado se encuentra inactivo.');
        }

        finalCustomerId = cRow.id;
        finalCustomerNameSnapshot =
          cRow.last_name && cRow.last_name.trim().length > 0
            ? `${cRow.name.trim()} ${cRow.last_name.trim()}`
            : cRow.name.trim();
      }

      // 1. Insert into sales
      await db.execute(
        `INSERT INTO sales (
          id, business_id, sale_number, sale_sequence, status, customer_id, cash_session_id, customer_name_snapshot,
          subtotal, discount_total, tax_total, total, currency_code, note, idempotency_key,
          created_by_user_id, created_by_name_snapshot, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.id,
          sale.businessId,
          sale.saleNumber,
          sale.saleSequence,
          sale.status,
          finalCustomerId,
          sale.cashSessionId || null,
          finalCustomerNameSnapshot,
          sale.subtotal,
          sale.discountTotal,
          sale.taxTotal,
          sale.total,
          sale.currencyCode,
          sale.note || null,
          sale.idempotencyKey,
          sale.createdByUserId,
          sale.createdByNameSnapshot,
          sale.createdAt,
          sale.completedAt,
        ]
      );

      // 2. Insert into sale_items
      for (const item of items) {
        await db.execute(
          `INSERT INTO sale_items (
            id, business_id, sale_id, product_id, presentation_id, product_name_snapshot,
            presentation_name_snapshot, base_unit, presentation_factor, quantity,
            inventory_quantity_delta, unit_price, discount_total, line_total,
            unit_cost_snapshot, line_cost_total, cost_quality_snapshot,
            sku_snapshot, barcode_snapshot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.businessId,
            item.saleId,
            item.productId,
            item.presentationId || null,
            item.productNameSnapshot,
            item.presentationNameSnapshot || null,
            item.baseUnit,
            item.presentationFactor,
            item.quantity,
            item.inventoryQuantityDelta,
            item.unitPrice,
            item.discountTotal,
            item.lineTotal,
            item.unitCostSnapshot || null,
            item.lineCostTotal || null,
            item.costQualitySnapshot,
            item.skuSnapshot || null,
            item.barcodeSnapshot || null,
            item.createdAt,
          ]
        );
      }

      // 3. Insert into sale_payments
      for (const payment of payments) {
        await db.execute(
          `INSERT INTO sale_payments (
            id, business_id, sale_id, payment_method_id, payment_method_code,
            payment_method_name_snapshot, amount, currency_code, received_amount,
            change_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payment.id,
            payment.businessId,
            payment.saleId,
            payment.paymentMethodId,
            payment.paymentMethodCode,
            payment.paymentMethodNameSnapshot,
            payment.amount,
            payment.currencyCode,
            payment.receivedAmount || null,
            payment.changeAmount || null,
            payment.createdAt,
          ]
        );
      }

      // 4. Insert into inventory_movements
      for (const mov of movements) {
        await db.execute(
          `INSERT INTO inventory_movements (
            id, business_id, product_id, lot_id, movement_type, quantity_delta,
            unit_cost, total_cost, reason_code, note, reference_type, reference_id,
            created_by_user_id, occurred_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            mov.id,
            mov.businessId,
            mov.productId,
            mov.lotId || null,
            mov.movementType,
            mov.quantityDelta,
            mov.unitCost || null,
            mov.totalCost || null,
            mov.reasonCode || null,
            mov.note || null,
            mov.referenceType || null,
            mov.referenceId || null,
            mov.createdByUserId,
            mov.occurredAt,
            mov.createdAt,
          ]
        );
      }

      // 5. Insert atomic SALE_CASH movement if payment includes physical cash
      if (cashMovement) {
        await db.execute(
          `INSERT INTO cash_movements (
            id, business_id, cash_session_id, cash_register_id, movement_type,
            amount, currency_code, reason, note, reference_type, reference_id,
            created_by_user_id, created_by_name_snapshot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cashMovement.id,
            cashMovement.businessId,
            cashMovement.cashSessionId,
            cashMovement.cashRegisterId,
            cashMovement.movementType,
            cashMovement.amount,
            cashMovement.currencyCode,
            cashMovement.reason,
            cashMovement.note || null,
            cashMovement.referenceType || null,
            cashMovement.referenceId || null,
            cashMovement.createdByUserId,
            cashMovement.createdByNameSnapshot,
            cashMovement.createdAt,
          ]
        );
      }

      await db.execute('COMMIT');

      return {
        sale: { ...sale },
        items: items.map((i) => ({ ...i })),
        payments: payments.map((p) => ({ ...p })),
      };
    } catch (err) {
      try {
        await db.execute('ROLLBACK');
      } catch (rbErr) {
        logger.error('SqliteSaleRepository', 'Error rolling back transaction', { error: String(rbErr) });
      }
      logger.error('SqliteSaleRepository', 'Transaction error in createSaleTransaction', { error: String(err) });
      throw err;
    }
  }

  async getSaleById(id: string): Promise<SaleWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getSaleById(id);

    try {
      const saleRows = await db.select<SaleRow[]>('SELECT * FROM sales WHERE id = ? LIMIT 1', [id]);
      if (saleRows.length === 0) return null;

      const itemRows = await db.select<SaleItemRow[]>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY rowid ASC', [id]);
      const paymentRows = await db.select<SalePaymentRow[]>('SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY rowid ASC', [id]);

      return {
        sale: this.saleRowToEntity(saleRows[0]),
        items: itemRows.map((r) => this.itemRowToEntity(r)),
        payments: paymentRows.map((r) => this.paymentRowToEntity(r)),
      };
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error getting sale by id', { error: String(err) });
      return this.fallbackRepo.getSaleById(id);
    }
  }

  async getSaleByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<SaleWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getSaleByIdempotencyKey(businessId, idempotencyKey);

    try {
      const saleRows = await db.select<SaleRow[]>(
        'SELECT * FROM sales WHERE business_id = ? AND idempotency_key = ? LIMIT 1',
        [businessId, idempotencyKey]
      );
      if (saleRows.length === 0) return null;

      const saleId = saleRows[0].id;
      const itemRows = await db.select<SaleItemRow[]>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY rowid ASC', [saleId]);
      const paymentRows = await db.select<SalePaymentRow[]>('SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY rowid ASC', [saleId]);

      return {
        sale: this.saleRowToEntity(saleRows[0]),
        items: itemRows.map((r) => this.itemRowToEntity(r)),
        payments: paymentRows.map((r) => this.paymentRowToEntity(r)),
      };
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error getting sale by idempotency key', { error: String(err) });
      return this.fallbackRepo.getSaleByIdempotencyKey(businessId, idempotencyKey);
    }
  }

  async getNextSaleSequence(businessId: string): Promise<{ sequence: number; saleNumber: string }> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getNextSaleSequence(businessId);

    try {
      const rows = await db.select<{ max_seq: number | null }[]>(
        'SELECT MAX(sale_sequence) as max_seq FROM sales WHERE business_id = ?',
        [businessId]
      );
      const maxSeq = rows.length > 0 && rows[0].max_seq != null ? rows[0].max_seq : 0;
      const nextSeq = maxSeq + 1;
      const saleNumber = `V-${String(nextSeq).padStart(6, '0')}`;
      return { sequence: nextSeq, saleNumber };
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error generating next sale sequence', { error: String(err) });
      return this.fallbackRepo.getNextSaleSequence(businessId);
    }
  }

  async listSales(businessId: string, options?: ListSalesOptions): Promise<Sale[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.listSales(businessId, options);

    try {
      let query = 'SELECT * FROM sales WHERE business_id = ? ORDER BY created_at DESC';
      const params: unknown[] = [businessId];

      if (options?.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        if (options?.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const rows = await db.select<SaleRow[]>(query, params);
      return rows.map((r) => this.saleRowToEntity(r));
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error listing sales', { error: String(err) });
      return this.fallbackRepo.listSales(businessId, options);
    }
  }

  async countSales(businessId: string): Promise<number> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.countSales(businessId);

    try {
      const rows = await db.select<{ count: number }[]>(
        'SELECT count(*) as count FROM sales WHERE business_id = ?',
        [businessId]
      );
      return rows.length > 0 ? rows[0].count : 0;
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error counting sales', { error: String(err) });
      return this.fallbackRepo.countSales(businessId);
    }
  }

  async getSalesSummary(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<import('../../domain/sales/repositories/SaleRepository').SalesPeriodSummary> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getSalesSummary(businessId, fromUtc, toUtc);

    try {
      const rows = await db.select<{
        total_sales: number;
        ticket_count: number;
        total_discount: number;
        real_profit: number;
        uncosted_count: number;
        total_items: number;
      }[]>(
        `SELECT 
          COALESCE(SUM(s.total), 0) AS total_sales,
          COUNT(DISTINCT s.id) AS ticket_count,
          COALESCE(SUM(s.discount_total), 0) AS total_discount,
          COALESCE(SUM(CASE WHEN si.cost_quality_snapshot = 'REAL' THEN (si.line_total - COALESCE(si.line_cost_total, 0)) ELSE 0 END), 0) AS real_profit,
          COALESCE(SUM(CASE WHEN si.cost_quality_snapshot != 'REAL' THEN 1 ELSE 0 END), 0) AS uncosted_count,
          COUNT(si.id) AS total_items
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id AND si.business_id = s.business_id
        WHERE s.business_id = ? 
          AND s.completed_at >= ? 
          AND s.completed_at < ? 
          AND s.status = 'COMPLETED'`,
        [businessId, fromUtc, toUtc]
      );

      if (rows.length === 0 || rows[0].ticket_count === 0) {
        return {
          totalSales: 0,
          ticketCount: 0,
          totalDiscount: 0,
          profitMinor: null,
          profitQuality: 'INCOMPLETE',
        };
      }

      const r = rows[0];
      const profitQuality = r.uncosted_count > 0 || r.total_items === 0 ? 'INCOMPLETE' : 'COMPLETE';
      const profitMinor = profitQuality === 'COMPLETE' ? r.real_profit : null;

      return {
        totalSales: r.total_sales,
        ticketCount: r.ticket_count,
        totalDiscount: r.total_discount,
        profitMinor,
        profitQuality,
      };
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error getting sales summary', { error: String(err) });
      return this.fallbackRepo.getSalesSummary(businessId, fromUtc, toUtc);
    }
  }

  async getHourlySales(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<import('../../domain/sales/repositories/SaleRepository').HourlySalesPoint[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getHourlySales(businessId, fromUtc, toUtc);

    try {
      // In SQLite, strftime('%H', completed_at) returns UTC hour 00..23
      const rows = await db.select<{
        hour_str: string;
        total_sales: number;
        ticket_count: number;
      }[]>(
        `SELECT 
          strftime('%H', completed_at) AS hour_str,
          COALESCE(SUM(total), 0) AS total_sales,
          COUNT(id) AS ticket_count
        FROM sales
        WHERE business_id = ? 
          AND completed_at >= ? 
          AND completed_at < ? 
          AND status = 'COMPLETED'
        GROUP BY strftime('%H', completed_at)
        ORDER BY hour_str ASC`,
        [businessId, fromUtc, toUtc]
      );

      const hourMap = new Map<number, { total: number; count: number }>();
      for (let h = 0; h < 24; h++) {
        hourMap.set(h, { total: 0, count: 0 });
      }

      for (const r of rows) {
        const h = parseInt(r.hour_str, 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          hourMap.set(h, { total: r.total_sales, count: r.ticket_count });
        }
      }

      const result: import('../../domain/sales/repositories/SaleRepository').HourlySalesPoint[] = [];
      for (let h = 0; h < 24; h++) {
        const entry = hourMap.get(h) || { total: 0, count: 0 };
        result.push({
          hour: h,
          label: `${String(h).padStart(2, '0')}:00`,
          totalSales: entry.total,
          ticketCount: entry.count,
        });
      }
      return result;
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error getting hourly sales', { error: String(err) });
      return this.fallbackRepo.getHourlySales(businessId, fromUtc, toUtc);
    }
  }

  async getTopSellingProducts(
    businessId: string,
    fromUtc: string,
    toUtc: string,
    limit = 5
  ): Promise<import('../../domain/sales/repositories/SaleRepository').TopSellingProductRow[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getTopSellingProducts(businessId, fromUtc, toUtc, limit);

    try {
      const rows = await db.select<{
        product_id: string;
        product_name: string;
        base_unit: string;
        total_quantity_scaled: number;
        total_revenue: number;
        transaction_count: number;
      }[]>(
        `SELECT 
          si.product_id,
          si.product_name_snapshot AS product_name,
          si.base_unit,
          COALESCE(SUM(si.quantity), 0) AS total_quantity_scaled,
          COALESCE(SUM(si.line_total), 0) AS total_revenue,
          COUNT(DISTINCT si.sale_id) AS transaction_count
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id AND s.business_id = si.business_id
        WHERE s.business_id = ? 
          AND s.completed_at >= ? 
          AND s.completed_at < ? 
          AND s.status = 'COMPLETED'
        GROUP BY si.product_id, si.product_name_snapshot, si.base_unit
        ORDER BY total_revenue DESC, total_quantity_scaled DESC
        LIMIT ?`,
        [businessId, fromUtc, toUtc, limit]
      );

      return rows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        baseUnit: r.base_unit,
        totalQuantityMajor: r.total_quantity_scaled / 1000,
        totalRevenue: r.total_revenue,
        transactionCount: r.transaction_count,
      }));
    } catch (err) {
      logger.error('SqliteSaleRepository', 'Error getting top products', { error: String(err) });
      return this.fallbackRepo.getTopSellingProducts(businessId, fromUtc, toUtc, limit);
    }
  }
}
