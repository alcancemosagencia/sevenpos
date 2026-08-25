import {
  InventoryQueryRepository,
  InventoryProductRow,
  InventoryKPIMetrics,
} from '../../domain/inventory/repositories/InventoryQueryRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { InMemoryInventoryQueryRepository } from './InMemoryInventoryQueryRepository';
import { Product } from '../../domain/catalog/Product';
import { deriveStockStatus } from '../../domain/inventory/InventoryStockStatus';
import { BaseUnitCode } from '../../domain/common/unit/BaseUnit';

interface ProductInventorySqlRow {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  base_unit: string;
  sale_price: number;
  cost_price: number | null;
  minimum_stock: number | null;
  image_path: string | null;
  featured: number;
  active: number;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_color: string | null;
  current_stock: number | null;
  last_movement_at: string | null;
  lot_count: number | null;
}

export class SqliteInventoryQueryRepository implements InventoryQueryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryInventoryQueryRepository
  ) {}

  private mapSqlRowToProduct(row: ProductInventorySqlRow): Product {
    return {
      id: row.id,
      businessId: row.business_id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      baseUnit: row.base_unit as BaseUnitCode,
      salePrice: row.sale_price,
      costPrice: row.cost_price,
      minimumStock: row.minimum_stock,
      imagePath: row.image_path,
      featured: Boolean(row.featured),
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listStockTable(params: {
    businessId: string;
    query?: string;
    categoryId?: string;
    status?: 'all' | 'available' | 'low_stock' | 'out_of_stock';
    limit?: number;
    offset?: number;
  }): Promise<{ rows: InventoryProductRow[]; total: number }> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listStockTable(params);
    }

    const conditions: string[] = ['p.business_id = ?'];
    const sqlParams: (string | number)[] = [params.businessId, params.businessId, params.businessId];

    if (params.query && params.query.trim().length > 0) {
      const q = `%${params.query.trim()}%`;
      conditions.push(
        '(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR EXISTS (SELECT 1 FROM product_presentations pr WHERE pr.product_id = p.id AND (pr.barcode LIKE ? OR pr.sku LIKE ?)))'
      );
      sqlParams.push(q, q, q, q, q);
    }

    if (params.categoryId && params.categoryId !== 'all') {
      conditions.push('p.category_id = ?');
      sqlParams.push(params.categoryId);
    }

    const whereClause = conditions.join(' AND ');

    // Fetch all matching products with stock
    const querySql = `
      WITH stock AS (
        SELECT product_id,
               SUM(quantity_delta) AS current_stock,
               MAX(occurred_at) AS last_movement_at
        FROM inventory_movements
        WHERE business_id = ?
        GROUP BY product_id
      ),
      lot_counts AS (
        SELECT product_id, COUNT(DISTINCT id) AS lot_count
        FROM inventory_lots
        WHERE business_id = ?
        GROUP BY product_id
      )
      SELECT 
        p.*, 
        c.name AS category_name, 
        c.color AS category_color,
        COALESCE(s.current_stock, 0) AS current_stock,
        s.last_movement_at,
        COALESCE(lc.lot_count, 0) AS lot_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      LEFT JOIN lot_counts lc ON p.id = lc.product_id
      WHERE ${whereClause}
      ORDER BY p.name ASC;
    `;

    const allRows = await db.select<ProductInventorySqlRow[]>(querySql, sqlParams);

    // Filter by stock status if requested
    let filtered = allRows.map((r) => {
      const currentStock = r.current_stock || 0;
      const status = deriveStockStatus(currentStock, r.minimum_stock);

      return {
        product: this.mapSqlRowToProduct(r),
        categoryName: r.category_name,
        categoryColor: r.category_color,
        currentStock,
        minimumStock: r.minimum_stock,
        status,
        estimatedCost: r.cost_price,
        costQuality: r.cost_price ? ('REFERENCE' as const) : ('UNKNOWN' as const),
        lastMovementAt: r.last_movement_at,
        lotCount: r.lot_count || 0,
      };
    });

    if (params.status && params.status !== 'all') {
      if (params.status === 'available') {
        filtered = filtered.filter((r) => r.status === 'AVAILABLE');
      } else if (params.status === 'low_stock') {
        filtered = filtered.filter((r) => r.status === 'LOW_STOCK');
      } else if (params.status === 'out_of_stock') {
        filtered = filtered.filter((r) => r.status === 'OUT_OF_STOCK');
      }
    }

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return {
      rows: filtered.slice(offset, offset + limit),
      total,
    };
  }

  async getMetrics(businessId: string): Promise<InventoryKPIMetrics> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getMetrics(businessId);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const stockSql = `
      WITH stock AS (
        SELECT product_id, SUM(quantity_delta) AS current_stock
        FROM inventory_movements
        WHERE business_id = ?
        GROUP BY product_id
      )
      SELECT 
        p.id,
        p.cost_price,
        p.minimum_stock,
        COALESCE(s.current_stock, 0) AS current_stock
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.business_id = ?;
    `;

    const productStocks = await db.select<
      { id: string; cost_price: number | null; minimum_stock: number | null; current_stock: number }[]
    >(stockSql, [businessId, businessId]);

    const movementCountRows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM inventory_movements 
       WHERE business_id = ? AND occurred_at LIKE ?;`,
      [businessId, `${todayStr}%`]
    );
    const todayMovements = movementCountRows[0]?.count || 0;

    let withStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const p of productStocks) {
      const stock = p.current_stock;
      const status = deriveStockStatus(stock, p.minimum_stock);

      if (stock > 0) withStock++;
      if (status === 'LOW_STOCK') lowStock++;
      if (status === 'OUT_OF_STOCK') outOfStock++;

      if (stock > 0 && p.cost_price) {
        totalValue += Math.round((stock / 1000) * p.cost_price);
      }
    }

    return {
      totalProductsWithStock: withStock,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalMovementsToday: todayMovements,
      estimatedTotalInventoryValue: totalValue,
    };
  }
}
