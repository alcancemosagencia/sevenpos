import { PaymentMethod, PaymentMethodCode, DEFAULT_PAYMENT_METHOD_DEFINITIONS } from '../../domain/sales/PaymentMethod';
import { PaymentMethodRepository } from '../../domain/sales/repositories/PaymentMethodRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { logger } from '../logging/Logger';

interface PaymentMethodRow {
  id: string;
  business_id: string;
  code: string;
  name: string;
  active: number;
  allows_change: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class SqlitePaymentMethodRepository implements PaymentMethodRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: PaymentMethodRepository
  ) {}

  private rowToEntity(row: PaymentMethodRow): PaymentMethod {
    return {
      id: row.id,
      businessId: row.business_id,
      code: row.code as PaymentMethodCode,
      name: row.name,
      active: Boolean(row.active),
      allowsChange: Boolean(row.allows_change),
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listActivePaymentMethods(businessId: string): Promise<PaymentMethod[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.listActivePaymentMethods(businessId);

    try {
      await this.ensureDefaultMethods(businessId);
      const rows = await db.select<PaymentMethodRow[]>(
        'SELECT * FROM payment_methods WHERE business_id = ? AND active = 1 ORDER BY sort_order ASC',
        [businessId]
      );
      return rows.map((r) => this.rowToEntity(r));
    } catch (err) {
      logger.error('SqlitePaymentMethodRepository', 'Error listing active payment methods', { error: String(err) });
      return this.fallbackRepo.listActivePaymentMethods(businessId);
    }
  }

  async getPaymentMethodByCode(businessId: string, code: PaymentMethodCode): Promise<PaymentMethod | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getPaymentMethodByCode(businessId, code);

    try {
      await this.ensureDefaultMethods(businessId);
      const rows = await db.select<PaymentMethodRow[]>(
        'SELECT * FROM payment_methods WHERE business_id = ? AND code = ? LIMIT 1',
        [businessId, code]
      );
      return rows.length > 0 ? this.rowToEntity(rows[0]) : null;
    } catch (err) {
      logger.error('SqlitePaymentMethodRepository', 'Error getting payment method by code', { error: String(err) });
      return this.fallbackRepo.getPaymentMethodByCode(businessId, code);
    }
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.getPaymentMethodById(id);

    try {
      const rows = await db.select<PaymentMethodRow[]>(
        'SELECT * FROM payment_methods WHERE id = ? LIMIT 1',
        [id]
      );
      return rows.length > 0 ? this.rowToEntity(rows[0]) : null;
    } catch (err) {
      logger.error('SqlitePaymentMethodRepository', 'Error getting payment method by id', { error: String(err) });
      return this.fallbackRepo.getPaymentMethodById(id);
    }
  }

  async savePaymentMethod(method: PaymentMethod): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.savePaymentMethod(method);

    try {
      await db.execute(
        `INSERT INTO payment_methods (id, business_id, code, name, active, allows_change, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           active = excluded.active,
           allows_change = excluded.allows_change,
           sort_order = excluded.sort_order,
           updated_at = excluded.updated_at`,
        [
          method.id,
          method.businessId,
          method.code,
          method.name,
          method.active ? 1 : 0,
          method.allowsChange ? 1 : 0,
          method.sortOrder,
          method.createdAt,
          method.updatedAt,
        ]
      );
    } catch (err) {
      logger.error('SqlitePaymentMethodRepository', 'Error saving payment method', { error: String(err) });
      await this.fallbackRepo.savePaymentMethod(method);
    }
  }

  async ensureDefaultMethods(businessId: string): Promise<void> {
    if (!businessId) return;
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.ensureDefaultMethods(businessId);

    try {
      const existing = await db.select<{ count: number }[]>(
        'SELECT count(*) as count FROM payment_methods WHERE business_id = ?',
        [businessId]
      );
      if (existing.length === 0 || existing[0].count === 0) {
        const now = getCurrentUtcIsoString();
        for (const def of DEFAULT_PAYMENT_METHOD_DEFINITIONS) {
          await db.execute(
            `INSERT OR IGNORE INTO payment_methods (id, business_id, code, name, active, allows_change, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
            [
              generateUuid(),
              businessId,
              def.code,
              def.name,
              def.allowsChange ? 1 : 0,
              def.sortOrder,
              now,
              now,
            ]
          );
        }
      }
    } catch (err) {
      logger.warn('SqlitePaymentMethodRepository', 'Non-fatal error in ensureDefaultMethods', { error: String(err) });
      await this.fallbackRepo.ensureDefaultMethods(businessId);
    }
  }
}
