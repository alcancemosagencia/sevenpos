import {
  ProductRepository,
  ProductFilterParams,
  ProductListResult,
  ProductKpiSummary,
  ProductDetailWithPresentations,
  ProductListItem,
} from '../../domain/catalog/ProductRepository';
import { Product } from '../../domain/catalog/Product';
import { Category } from '../../domain/catalog/Category';
import { BaseUnitCode } from '../../domain/common/unit/BaseUnit';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';
import { SqliteProductPresentationRepository } from './SqliteProductPresentationRepository';

interface ProductRow {
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
}

interface ProductJoinRow extends ProductRow {
  category_name: string | null;
  category_color: string | null;
  category_active: number | null;
  category_created_at: string | null;
  category_updated_at: string | null;
  presentation_count: number;
}

export class SqliteProductRepository implements ProductRepository {
  private presentationRepo: SqliteProductPresentationRepository;

  constructor(private dbManager: DatabaseManager) {
    this.presentationRepo = new SqliteProductPresentationRepository(dbManager);
  }

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) throw new Error('SQLite Database no está disponible en este entorno.');
    return db;
  }

  async getById(id: string, businessId: string): Promise<Product | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<ProductRow[]>(
        'SELECT id, business_id, category_id, name, description, sku, barcode, base_unit, sale_price, cost_price, minimum_stock, image_path, featured, active, created_at, updated_at FROM products WHERE id = $1 AND business_id = $2 LIMIT 1;',
        [id, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en getById', { error: String(err) });
      throw err;
    }
  }

  async getDetailById(id: string, businessId: string): Promise<ProductDetailWithPresentations | null> {
    try {
      const product = await this.getById(id, businessId);
      if (!product) return null;

      let category: Category | null = null;
      if (product.categoryId) {
        const db = await this.getDb();
        const catRows = await db.select<Array<{
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          color: string | null;
          active: number;
          created_at: string;
          updated_at: string;
        }>>(
          'SELECT id, business_id, name, description, color, active, created_at, updated_at FROM categories WHERE id = $1 AND business_id = $2 LIMIT 1;',
          [product.categoryId, businessId]
        );
        if (catRows && catRows.length > 0) {
          const r = catRows[0];
          category = {
            id: r.id,
            businessId: r.business_id,
            name: r.name,
            description: r.description,
            color: r.color,
            active: r.active === 1,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
      }

      const presentations = await this.presentationRepo.listByProduct(id, businessId);

      return {
        product,
        category,
        presentations,
      };
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en getDetailById', { error: String(err) });
      throw err;
    }
  }

  async findBySku(sku: string, businessId: string): Promise<Product | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<ProductRow[]>(
        'SELECT id, business_id, category_id, name, description, sku, barcode, base_unit, sale_price, cost_price, minimum_stock, image_path, featured, active, created_at, updated_at FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM($1)) AND business_id = $2 LIMIT 1;',
        [sku, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en findBySku', { error: String(err) });
      throw err;
    }
  }

  async findByBarcode(barcode: string, businessId: string): Promise<Product | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<ProductRow[]>(
        'SELECT id, business_id, category_id, name, description, sku, barcode, base_unit, sale_price, cost_price, minimum_stock, image_path, featured, active, created_at, updated_at FROM products WHERE TRIM(barcode) = TRIM($1) AND business_id = $2 LIMIT 1;',
        [barcode, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en findByBarcode', { error: String(err) });
      throw err;
    }
  }

  async list(params: ProductFilterParams): Promise<ProductListResult> {
    try {
      const db = await this.getDb();
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
      const offset = (page - 1) * pageSize;

      const whereClauses: string[] = ['p.business_id = $1'];
      const queryParams: unknown[] = [params.businessId];
      let paramIndex = 2;

      // Status filter
      if (params.status === 'active') {
        whereClauses.push('p.active = 1');
      } else if (params.status === 'inactive') {
        whereClauses.push('p.active = 0');
      }

      // Category filter
      if (params.categoryId) {
        if (params.categoryId === 'uncategorized') {
          whereClauses.push('p.category_id IS NULL');
        } else {
          whereClauses.push(`p.category_id = $${paramIndex}`);
          queryParams.push(params.categoryId);
          paramIndex++;
        }
      }

      // Search query (search product name, sku, barcode, OR presentation sku, barcode)
      if (params.query && params.query.trim()) {
        const term = `%${params.query.trim()}%`;
        whereClauses.push(
          `(p.name LIKE $${paramIndex} OR p.sku LIKE $${paramIndex} OR p.barcode LIKE $${paramIndex} OR EXISTS (SELECT 1 FROM product_presentations pr WHERE pr.product_id = p.id AND (pr.sku LIKE $${paramIndex} OR pr.barcode LIKE $${paramIndex} OR pr.name LIKE $${paramIndex})))`
        );
        queryParams.push(term);
        paramIndex++;
      }

      // Has presentations filter
      if (params.hasPresentations !== undefined) {
        if (params.hasPresentations) {
          whereClauses.push('(SELECT COUNT(*) FROM product_presentations pp WHERE pp.product_id = p.id AND pp.active = 1) > 0');
        } else {
          whereClauses.push('(SELECT COUNT(*) FROM product_presentations pp WHERE pp.product_id = p.id AND pp.active = 1) = 0');
        }
      }

      const whereSql = whereClauses.join(' AND ');

      // Count total
      const countSql = `SELECT COUNT(*) as total FROM products p WHERE ${whereSql};`;
      const countRows = await db.select<{ total: number }[]>(countSql, queryParams);
      const total = countRows[0]?.total ?? 0;

      // Sorting
      let sortColumn = 'p.created_at';
      if (params.sortBy === 'name') sortColumn = 'p.name';
      else if (params.sortBy === 'price') sortColumn = 'p.sale_price';
      const order = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Fetch page items with category and presentation count
      const itemsSql = `
        SELECT 
          p.id, p.business_id, p.category_id, p.name, p.description, p.sku, p.barcode, 
          p.base_unit, p.sale_price, p.cost_price, p.minimum_stock, p.image_path, p.featured, 
          p.active, p.created_at, p.updated_at,
          c.name as category_name, c.color as category_color, c.active as category_active,
          c.created_at as category_created_at, c.updated_at as category_updated_at,
          (SELECT COUNT(*) FROM product_presentations pp WHERE pp.product_id = p.id AND pp.active = 1) as presentation_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereSql}
        ORDER BY ${sortColumn} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;

      const listParams = [...queryParams, pageSize, offset];
      const rows = await db.select<ProductJoinRow[]>(itemsSql, listParams);

      const items: ProductListItem[] = rows.map((r) => {
        const product = this.mapRow(r);
        let category: Category | null = null;
        if (r.category_id && r.category_name) {
          category = {
            id: r.category_id,
            businessId: r.business_id,
            name: r.category_name,
            color: r.category_color,
            active: r.category_active === 1,
            createdAt: r.category_created_at || r.created_at,
            updatedAt: r.category_updated_at || r.updated_at,
          };
        }
        return {
          product,
          category,
          presentationCount: r.presentation_count ?? 0,
        };
      });

      const totalPages = Math.ceil(total / pageSize) || 1;

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en list', { error: String(err) });
      throw err;
    }
  }

  async getKpiSummary(businessId: string): Promise<ProductKpiSummary> {
    try {
      const db = await this.getDb();
      const rows = await db.select<Array<{
        active_products?: number;
        total_categories?: number;
        uncategorized_products?: number;
        with_presentations?: number;
      }>>(
        `SELECT 
          (SELECT COUNT(*) FROM products WHERE business_id = $1 AND active = 1) as active_products,
          (SELECT COUNT(*) FROM categories WHERE business_id = $1 AND active = 1) as total_categories,
          (SELECT COUNT(*) FROM products WHERE business_id = $1 AND active = 1 AND category_id IS NULL) as uncategorized_products,
          (SELECT COUNT(DISTINCT product_id) FROM product_presentations WHERE business_id = $1 AND active = 1) as with_presentations;`,
        [businessId]
      );
      const r = rows[0] || {};
      return {
        activeProducts: r.active_products ?? 0,
        totalCategories: r.total_categories ?? 0,
        uncategorizedProducts: r.uncategorized_products ?? 0,
        productsWithPresentations: r.with_presentations ?? 0,
      };
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en getKpiSummary', { error: String(err) });
      throw err;
    }
  }

  async save(product: Product): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO products (id, business_id, category_id, name, description, sku, barcode, base_unit, sale_price, cost_price, minimum_stock, image_path, featured, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`,
        [
          product.id,
          product.businessId,
          product.categoryId || null,
          product.name,
          product.description || null,
          product.sku || null,
          product.barcode || null,
          product.baseUnit,
          product.salePrice,
          product.costPrice ?? null,
          product.minimumStock ?? null,
          product.imagePath || null,
          product.featured ? 1 : 0,
          product.active ? 1 : 0,
          product.createdAt,
          product.updatedAt,
        ]
      );
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en save', { error: String(err) });
      throw err;
    }
  }

  async update(product: Product): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE products SET category_id = $1, name = $2, description = $3, sku = $4, barcode = $5, base_unit = $6, sale_price = $7, cost_price = $8, minimum_stock = $9, image_path = $10, featured = $11, active = $12, updated_at = $13
         WHERE id = $14 AND business_id = $15;`,
        [
          product.categoryId || null,
          product.name,
          product.description || null,
          product.sku || null,
          product.barcode || null,
          product.baseUnit,
          product.salePrice,
          product.costPrice ?? null,
          product.minimumStock ?? null,
          product.imagePath || null,
          product.featured ? 1 : 0,
          product.active ? 1 : 0,
          product.updatedAt,
          product.id,
          product.businessId,
        ]
      );
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en update', { error: String(err) });
      throw err;
    }
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE products SET active = 0, updated_at = $1 WHERE id = $2 AND business_id = $3;`,
        [new Date().toISOString(), id, businessId]
      );
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en deactivate', { error: String(err) });
      throw err;
    }
  }

  async activate(id: string, businessId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE products SET active = 1, updated_at = $1 WHERE id = $2 AND business_id = $3;`,
        [new Date().toISOString(), id, businessId]
      );
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en activate', { error: String(err) });
      throw err;
    }
  }

  async countByBusiness(businessId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM products WHERE business_id = $1;',
        [businessId]
      );
      return rows[0]?.count ?? 0;
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en countByBusiness', { error: String(err) });
      throw err;
    }
  }

  async countByCategory(categoryId: string, businessId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND business_id = $2;',
        [categoryId, businessId]
      );
      return rows[0]?.count ?? 0;
    } catch (err) {
      logger.error('SqliteProductRepository', 'Error en countByCategory', { error: String(err) });
      throw err;
    }
  }

  private mapRow(row: ProductRow): Product {
    return {
      id: row.id,
      businessId: row.business_id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      sku: row.sku,
      barcode: row.barcode,
      baseUnit: (row.base_unit as BaseUnitCode) || 'UNIT',
      salePrice: row.sale_price,
      costPrice: row.cost_price,
      minimumStock: row.minimum_stock,
      imagePath: row.image_path,
      featured: row.featured === 1,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
