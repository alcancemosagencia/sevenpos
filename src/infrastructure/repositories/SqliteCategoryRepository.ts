import { CategoryRepository } from '../../domain/catalog/CategoryRepository';
import { Category } from '../../domain/catalog/Category';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface CategoryRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private dbManager: DatabaseManager) {}

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      throw new Error('SQLite Database no está disponible en este entorno.');
    }
    return db;
  }

  async getById(id: string, businessId: string): Promise<Category | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<CategoryRow[]>(
        'SELECT id, business_id, name, description, color, active, created_at, updated_at FROM categories WHERE id = $1 AND business_id = $2 LIMIT 1;',
        [id, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en getById', { error: String(err) });
      throw err;
    }
  }

  async findByName(name: string, businessId: string): Promise<Category | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<CategoryRow[]>(
        'SELECT id, business_id, name, description, color, active, created_at, updated_at FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND business_id = $2 LIMIT 1;',
        [name, businessId]
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en findByName', { error: String(err) });
      throw err;
    }
  }

  async list(businessId: string, activeOnly = false): Promise<Category[]> {
    try {
      const db = await this.getDb();
      let sql = 'SELECT id, business_id, name, description, color, active, created_at, updated_at FROM categories WHERE business_id = $1';
      const params: (string | number)[] = [businessId];

      if (activeOnly) {
        sql += ' AND active = 1';
      }
      sql += ' ORDER BY name ASC;';

      const rows = await db.select<CategoryRow[]>(sql, params);
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en list', { error: String(err) });
      throw err;
    }
  }

  async save(category: Category): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO categories (id, business_id, name, description, color, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          category.id,
          category.businessId,
          category.name,
          category.description || null,
          category.color || null,
          category.active ? 1 : 0,
          category.createdAt,
          category.updatedAt,
        ]
      );
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en save', { error: String(err) });
      throw err;
    }
  }

  async update(category: Category): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE categories SET name = $1, description = $2, color = $3, active = $4, updated_at = $5
         WHERE id = $6 AND business_id = $7;`,
        [
          category.name,
          category.description || null,
          category.color || null,
          category.active ? 1 : 0,
          category.updatedAt,
          category.id,
          category.businessId,
        ]
      );
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en update', { error: String(err) });
      throw err;
    }
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE categories SET active = 0, updated_at = $1 WHERE id = $2 AND business_id = $3;`,
        [new Date().toISOString(), id, businessId]
      );
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en deactivate', { error: String(err) });
      throw err;
    }
  }

  async countByBusiness(businessId: string): Promise<number> {
    try {
      const db = await this.getDb();
      const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM categories WHERE business_id = $1;',
        [businessId]
      );
      return rows[0]?.count ?? 0;
    } catch (err) {
      logger.error('SqliteCategoryRepository', 'Error en countByBusiness', { error: String(err) });
      throw err;
    }
  }

  private mapRow(row: CategoryRow): Category {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      color: row.color,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
