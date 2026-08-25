import {
  InventoryMovementRepository,
  RecordMovementParams,
} from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { DatabaseManager } from '../database/DatabaseManager';
import { InMemoryInventoryMovementRepository } from './InMemoryInventoryMovementRepository';
import { logger } from '../logging/Logger';

interface MovementRow {
  id: string;
  business_id: string;
  product_id: string;
  lot_id: string | null;
  movement_type: string;
  quantity_delta: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason_code: string | null;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by_user_id: string;
  occurred_at: string;
  created_at: string;
}

export class SqliteInventoryMovementRepository implements InventoryMovementRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryInventoryMovementRepository
  ) {}

  private mapRowToMovement(row: MovementRow): InventoryMovement {
    return {
      id: row.id,
      businessId: row.business_id,
      productId: row.product_id,
      lotId: row.lot_id,
      movementType: row.movement_type as InventoryMovement['movementType'],
      quantityDelta: row.quantity_delta,
      unitCost: row.unit_cost,
      totalCost: row.total_cost,
      reasonCode: row.reason_code as InventoryMovement['reasonCode'],
      note: row.note,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      createdByUserId: row.created_by_user_id,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    };
  }

  async recordMovement(params: RecordMovementParams): Promise<InventoryMovement> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.recordMovement(params);
    }

    const now = new Date().toISOString();
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const occurredAt = params.occurredAt || now;

    try {
      await db.execute('BEGIN IMMEDIATE;');

      // Negative stock protection
      if (params.quantityDelta < 0) {
        // 1. Total product stock
        const totalRows = await db.select<{ stock: number | null }[]>(
          'SELECT SUM(quantity_delta) as stock FROM inventory_movements WHERE business_id = ? AND product_id = ?;',
          [params.businessId, params.productId]
        );
        const currentStock = totalRows[0]?.stock || 0;

        if (currentStock + params.quantityDelta < 0) {
          await db.execute('ROLLBACK;');
          throw new Error(
            `No puedes registrar una salida mayor al stock disponible (Stock actual: ${currentStock / 1000}, Salida intentada: ${Math.abs(params.quantityDelta) / 1000}).`
          );
        }

        if (params.lotId) {
          // 2. Specific lot stock
          const lotRows = await db.select<{ stock: number | null }[]>(
            'SELECT SUM(quantity_delta) as stock FROM inventory_movements WHERE business_id = ? AND lot_id = ?;',
            [params.businessId, params.lotId]
          );
          const lotStock = lotRows[0]?.stock || 0;

          if (lotStock + params.quantityDelta < 0) {
            await db.execute('ROLLBACK;');
            throw new Error(
              `No puedes registrar una salida mayor al stock disponible en el lote seleccionado (Stock lote: ${lotStock / 1000}, Salida: ${Math.abs(params.quantityDelta) / 1000}).`
            );
          }
        } else {
          // 3. Output without lot: check unallocated stock
          const lotAllocatedRows = await db.select<{ stock: number | null }[]>(
            'SELECT SUM(quantity_delta) as stock FROM inventory_movements WHERE business_id = ? AND product_id = ? AND lot_id IS NOT NULL;',
            [params.businessId, params.productId]
          );
          const allocatedStock = lotAllocatedRows[0]?.stock || 0;
          const unallocatedStock = currentStock - allocatedStock;

          if (unallocatedStock + params.quantityDelta < 0) {
            await db.execute('ROLLBACK;');
            throw new Error(
              `No puedes registrar una salida sin lote mayor al stock no asignado disponible (Stock sin lote: ${unallocatedStock / 1000}, Salida: ${Math.abs(params.quantityDelta) / 1000}).`
            );
          }
        }
      }

      await db.execute(
        `INSERT INTO inventory_movements (
          id, business_id, product_id, lot_id, movement_type, quantity_delta,
          unit_cost, total_cost, reason_code, note, reference_type, reference_id,
          created_by_user_id, occurred_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          movementId,
          params.businessId,
          params.productId,
          params.lotId || null,
          params.movementType,
          params.quantityDelta,
          params.unitCost ?? null,
          params.totalCost ?? null,
          params.reasonCode ?? null,
          params.note ?? null,
          params.referenceType ?? null,
          params.referenceId ?? null,
          params.createdByUserId,
          occurredAt,
          now,
        ]
      );

      await db.execute('COMMIT;');

      return {
        id: movementId,
        businessId: params.businessId,
        productId: params.productId,
        lotId: params.lotId || null,
        movementType: params.movementType,
        quantityDelta: params.quantityDelta,
        unitCost: params.unitCost ?? null,
        totalCost: params.totalCost ?? null,
        reasonCode: params.reasonCode ?? null,
        note: params.note ?? null,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        createdByUserId: params.createdByUserId,
        occurredAt,
        createdAt: now,
      };
    } catch (err) {
      try {
        await db.execute('ROLLBACK;');
      } catch {
        // ignore rollback errors if already aborted
      }
      logger.error('SqliteInventoryMovementRepository', 'Failed to record movement', { error: err });
      throw err;
    }
  }

  async listByProduct(productId: string, businessId: string): Promise<InventoryMovement[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listByProduct(productId, businessId);
    }

    const rows = await db.select<MovementRow[]>(
      `SELECT * FROM inventory_movements 
       WHERE business_id = ? AND product_id = ? 
       ORDER BY occurred_at DESC, created_at DESC;`,
      [businessId, productId]
    );

    return rows.map((r) => this.mapRowToMovement(r));
  }

  async listMovements(params: {
    businessId: string;
    productId?: string;
    movementType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ movements: InventoryMovement[]; total: number }> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listMovements(params);
    }

    const conditions: string[] = ['business_id = ?'];
    const sqlParams: (string | number)[] = [params.businessId];

    if (params.productId) {
      conditions.push('product_id = ?');
      sqlParams.push(params.productId);
    }
    if (params.movementType && params.movementType !== 'all') {
      conditions.push('movement_type = ?');
      sqlParams.push(params.movementType);
    }

    const whereClause = conditions.join(' AND ');

    const countRows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM inventory_movements WHERE ${whereClause};`,
      sqlParams
    );
    const total = countRows[0]?.count || 0;

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const rows = await db.select<MovementRow[]>(
      `SELECT * FROM inventory_movements 
       WHERE ${whereClause} 
       ORDER BY occurred_at DESC, created_at DESC 
       LIMIT ? OFFSET ?;`,
      [...sqlParams, limit, offset]
    );

    return {
      movements: rows.map((r) => this.mapRowToMovement(r)),
      total,
    };
  }

  async getCurrentStock(productId: string, businessId: string): Promise<number> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getCurrentStock(productId, businessId);
    }

    const rows = await db.select<{ stock: number | null }[]>(
      'SELECT SUM(quantity_delta) as stock FROM inventory_movements WHERE business_id = ? AND product_id = ?;',
      [businessId, productId]
    );

    return rows[0]?.stock || 0;
  }

  async getLotStock(lotId: string, businessId: string): Promise<number> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getLotStock(lotId, businessId);
    }

    const rows = await db.select<{ stock: number | null }[]>(
      'SELECT SUM(quantity_delta) as stock FROM inventory_movements WHERE business_id = ? AND lot_id = ?;',
      [businessId, lotId]
    );

    return rows[0]?.stock || 0;
  }
}
