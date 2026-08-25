import {
  InventoryLotRepository,
  CreateLotParams,
} from '../../domain/inventory/repositories/InventoryLotRepository';
import { InventoryLot, InventoryLotWithStock } from '../../domain/inventory/InventoryLot';
import { DatabaseManager } from '../database/DatabaseManager';
import { InMemoryInventoryLotRepository } from './InMemoryInventoryLotRepository';
import { logger } from '../logging/Logger';

interface LotRow {
  id: string;
  business_id: string;
  product_id: string;
  lot_code: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
  current_stock?: number | null;
}

export class SqliteInventoryLotRepository implements InventoryLotRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryInventoryLotRepository
  ) {}

  private mapRowToLot(row: LotRow): InventoryLot {
    return {
      id: row.id,
      businessId: row.business_id,
      productId: row.product_id,
      lotCode: row.lot_code,
      expirationDate: row.expiration_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createLot(params: CreateLotParams): Promise<InventoryLot> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.createLot(params);
    }

    const normalizedCode = params.lotCode ? params.lotCode.trim().toUpperCase() : null;
    if (normalizedCode) {
      const existing = await this.findByCode(params.productId, normalizedCode, params.businessId);
      if (existing) {
        return existing;
      }
    }

    const now = new Date().toISOString();
    const lotId = `lot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      await db.execute(
        `INSERT INTO inventory_lots (
          id, business_id, product_id, lot_code, expiration_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          lotId,
          params.businessId,
          params.productId,
          normalizedCode,
          params.expirationDate || null,
          now,
          now,
        ]
      );

      return {
        id: lotId,
        businessId: params.businessId,
        productId: params.productId,
        lotCode: normalizedCode,
        expirationDate: params.expirationDate || null,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      logger.error('SqliteInventoryLotRepository', 'Failed to create lot', { error: err });
      throw err;
    }
  }

  async getById(id: string, businessId: string): Promise<InventoryLot | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getById(id, businessId);
    }

    const rows = await db.select<LotRow[]>(
      'SELECT * FROM inventory_lots WHERE id = ? AND business_id = ?;',
      [id, businessId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToLot(rows[0]);
  }

  async findByCode(
    productId: string,
    lotCode: string,
    businessId: string
  ): Promise<InventoryLot | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.findByCode(productId, lotCode, businessId);
    }

    const normalized = lotCode.trim().toUpperCase();
    const rows = await db.select<LotRow[]>(
      'SELECT * FROM inventory_lots WHERE business_id = ? AND product_id = ? AND lot_code = ?;',
      [businessId, productId, normalized]
    );

    if (rows.length === 0) return null;
    return this.mapRowToLot(rows[0]);
  }

  async listByProductWithStock(productId: string, businessId: string): Promise<InventoryLotWithStock[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listByProductWithStock(productId, businessId);
    }

    const rows = await db.select<LotRow[]>(
      `SELECT l.*, COALESCE(SUM(m.quantity_delta), 0) AS current_stock 
       FROM inventory_lots l
       LEFT JOIN inventory_movements m ON l.id = m.lot_id
       WHERE l.business_id = ? AND l.product_id = ?
       GROUP BY l.id
       ORDER BY l.expiration_date ASC, l.created_at DESC;`,
      [businessId, productId]
    );

    const now = new Date();
    return rows.map((r) => {
      const stock = r.current_stock || 0;
      let status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' = 'ACTIVE';

      if (stock <= 0) {
        status = 'DEPLETED';
      } else if (r.expiration_date) {
        const exp = new Date(r.expiration_date);
        if (exp < now) {
          status = 'EXPIRED';
        }
      }

      return {
        ...this.mapRowToLot(r),
        currentStock: stock,
        status,
      };
    });
  }

  async listExpiringLots(businessId: string, daysThreshold: number = 30): Promise<InventoryLotWithStock[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listExpiringLots(businessId, daysThreshold);
    }

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    const rows = await db.select<LotRow[]>(
      `SELECT l.*, COALESCE(SUM(m.quantity_delta), 0) AS current_stock 
       FROM inventory_lots l
       LEFT JOIN inventory_movements m ON l.id = m.lot_id
       WHERE l.business_id = ? AND l.expiration_date IS NOT NULL AND l.expiration_date <= ?
       GROUP BY l.id
       HAVING current_stock > 0
       ORDER BY l.expiration_date ASC;`,
      [businessId, thresholdStr]
    );

    return rows.map((r) => {
      const stock = r.current_stock || 0;
      const isExpired = r.expiration_date ? new Date(r.expiration_date) < now : false;

      return {
        ...this.mapRowToLot(r),
        currentStock: stock,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
      };
    });
  }
}
