import { ProductPresentationRepository } from '../../domain/catalog/ProductPresentationRepository';
import { ProductPresentation } from '../../domain/catalog/ProductPresentation';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface PresentationRow {
  id: string;
  business_id: string;
  product_id: string;
  name: string;
  description: string | null;
  unit_factor: number;
  sale_price: number;
  sku: string | null;
  barcode: string | null;
  image_path: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteProductPresentationRepository implements ProductPresentationRepository {
  constructor(private dbManager: DatabaseManager) {}

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) throw new Error('SQLite Database no está disponible en este entorno.');
    return db;
  }

  async getById(id: string, businessId: string): Promise<ProductPresentation | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<PresentationRow[]>(
        'SELECT id, business_id, product_id, name, description, unit_factor, sale_price, sku, barcode, image_path, active, created_at, updated_at FROM product_presentations WHERE id = $1 AND business_id = $2 LIMIT 1;',
        [id, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en getById', { error: String(err) });
      throw err;
    }
  }

  async listByProduct(productId: string, businessId: string, activeOnly = false): Promise<ProductPresentation[]> {
    try {
      const db = await this.getDb();
      let sql = 'SELECT id, business_id, product_id, name, description, unit_factor, sale_price, sku, barcode, image_path, active, created_at, updated_at FROM product_presentations WHERE product_id = $1 AND business_id = $2';
      if (activeOnly) {
        sql += ' AND active = 1';
      }
      sql += ' ORDER BY unit_factor ASC, name ASC;';

      const rows = await db.select<PresentationRow[]>(sql, [productId, businessId]);
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en listByProduct', { error: String(err) });
      throw err;
    }
  }

  async findBySku(sku: string, businessId: string): Promise<ProductPresentation | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<PresentationRow[]>(
        'SELECT id, business_id, product_id, name, description, unit_factor, sale_price, sku, barcode, image_path, active, created_at, updated_at FROM product_presentations WHERE UPPER(TRIM(sku)) = UPPER(TRIM($1)) AND business_id = $2 LIMIT 1;',
        [sku, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en findBySku', { error: String(err) });
      throw err;
    }
  }

  async findByBarcode(barcode: string, businessId: string): Promise<ProductPresentation | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<PresentationRow[]>(
        'SELECT id, business_id, product_id, name, description, unit_factor, sale_price, sku, barcode, image_path, active, created_at, updated_at FROM product_presentations WHERE TRIM(barcode) = TRIM($1) AND business_id = $2 LIMIT 1;',
        [barcode, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en findByBarcode', { error: String(err) });
      throw err;
    }
  }

  async save(presentation: ProductPresentation): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO product_presentations (id, business_id, product_id, name, description, unit_factor, sale_price, sku, barcode, image_path, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          presentation.id,
          presentation.businessId,
          presentation.productId,
          presentation.name,
          presentation.description || null,
          presentation.unitFactor,
          presentation.salePrice,
          presentation.sku || null,
          presentation.barcode || null,
          presentation.imagePath || null,
          presentation.active ? 1 : 0,
          presentation.createdAt,
          presentation.updatedAt,
        ]
      );
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en save', { error: String(err) });
      throw err;
    }
  }

  async update(presentation: ProductPresentation): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE product_presentations SET name = $1, description = $2, unit_factor = $3, sale_price = $4, sku = $5, barcode = $6, image_path = $7, active = $8, updated_at = $9
         WHERE id = $10 AND business_id = $11;`,
        [
          presentation.name,
          presentation.description || null,
          presentation.unitFactor,
          presentation.salePrice,
          presentation.sku || null,
          presentation.barcode || null,
          presentation.imagePath || null,
          presentation.active ? 1 : 0,
          presentation.updatedAt,
          presentation.id,
          presentation.businessId,
        ]
      );
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en update', { error: String(err) });
      throw err;
    }
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE product_presentations SET active = 0, updated_at = $1 WHERE id = $2 AND business_id = $3;`,
        [new Date().toISOString(), id, businessId]
      );
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en deactivate', { error: String(err) });
      throw err;
    }
  }

  async activate(id: string, businessId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE product_presentations SET active = 1, updated_at = $1 WHERE id = $2 AND business_id = $3;`,
        [new Date().toISOString(), id, businessId]
      );
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en activate', { error: String(err) });
      throw err;
    }
  }

  async countByProduct(productId: string, businessId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM product_presentations WHERE product_id = $1 AND business_id = $2 AND active = 1;',
        [productId, businessId]
      );
      return rows[0]?.count ?? 0;
    } catch (err) {
      logger.error('SqliteProductPresentationRepository', 'Error en countByProduct', { error: String(err) });
      throw err;
    }
  }

  private mapRow(row: PresentationRow): ProductPresentation {
    return {
      id: row.id,
      businessId: row.business_id,
      productId: row.product_id,
      name: row.name,
      description: row.description,
      unitFactor: row.unit_factor,
      salePrice: row.sale_price,
      sku: row.sku,
      barcode: row.barcode,
      imagePath: row.image_path,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
