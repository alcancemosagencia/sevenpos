import {
  ExpenseCategory,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  DEFAULT_EXPENSE_CATEGORIES_DEFINITION,
  normalizeExpenseCategoryName,
  ExpenseCategorySystemKey,
} from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { logger } from '../logging/Logger';

interface CategoryRow {
  id: string;
  business_id: string;
  system_key: string | null;
  name: string;
  normalized_name: string;
  description: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: ExpenseCategoryRepository
  ) {}

  private mapRow(r: CategoryRow): ExpenseCategory {
    return {
      id: r.id,
      businessId: r.business_id,
      systemKey: (r.system_key as ExpenseCategorySystemKey | null) || null,
      name: r.name,
      normalizedName: r.normalized_name,
      description: r.description,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findById(businessId: string, id: string): Promise<ExpenseCategory | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findById(businessId, id);

    try {
      const rows: CategoryRow[] = await db.select(
        'SELECT * FROM expense_categories WHERE business_id = ? AND id = ?',
        [businessId, id]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in findById', { error: String(err) });
      return this.fallbackRepo.findById(businessId, id);
    }
  }

  async findByNormalizedName(businessId: string, normalizedName: string): Promise<ExpenseCategory | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findByNormalizedName(businessId, normalizedName);

    try {
      const rows: CategoryRow[] = await db.select(
        'SELECT * FROM expense_categories WHERE business_id = ? AND normalized_name = ?',
        [businessId, normalizedName]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in findByNormalizedName', { error: String(err) });
      return this.fallbackRepo.findByNormalizedName(businessId, normalizedName);
    }
  }

  async findBySystemKey(businessId: string, systemKey: string): Promise<ExpenseCategory | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findBySystemKey(businessId, systemKey);

    try {
      const rows: CategoryRow[] = await db.select(
        'SELECT * FROM expense_categories WHERE business_id = ? AND system_key = ?',
        [businessId, systemKey]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in findBySystemKey', { error: String(err) });
      return this.fallbackRepo.findBySystemKey(businessId, systemKey);
    }
  }

  async list(businessId: string, includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.list(businessId, includeInactive);

    try {
      await this.ensureDefaults(businessId);
      const query = includeInactive
        ? 'SELECT * FROM expense_categories WHERE business_id = ? ORDER BY name COLLATE NOCASE ASC'
        : 'SELECT * FROM expense_categories WHERE business_id = ? AND active = 1 ORDER BY name COLLATE NOCASE ASC';

      const rows: CategoryRow[] = await db.select(query, [businessId]);
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in list', { error: String(err) });
      return this.fallbackRepo.list(businessId, includeInactive);
    }
  }

  async create(businessId: string, dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.create(businessId, dto);

    try {
      const now = getCurrentUtcIsoString();
      const id = generateUuid();
      const normalized = normalizeExpenseCategoryName(dto.name);

      await db.execute(
        `INSERT INTO expense_categories (
          id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, businessId, dto.systemKey || null, dto.name, normalized, dto.description || null, now, now]
      );

      return {
        id,
        businessId,
        systemKey: dto.systemKey || null,
        name: dto.name,
        normalizedName: normalized,
        description: dto.description || null,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in create', { error: String(err) });
      return this.fallbackRepo.create(businessId, dto);
    }
  }

  async update(businessId: string, id: string, dto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.update(businessId, id, dto);

    try {
      const current = await this.findById(businessId, id);
      if (!current) {
        throw new Error('EXPENSE_CATEGORY_NOT_FOUND: Categoría no encontrada.');
      }

      const now = getCurrentUtcIsoString();
      const newName = dto.name !== undefined ? dto.name : current.name;
      const newNormalized = dto.name !== undefined ? normalizeExpenseCategoryName(dto.name) : current.normalizedName;
      const newDesc = dto.description !== undefined ? dto.description : current.description;
      const newActive = dto.active !== undefined ? (dto.active ? 1 : 0) : (current.active ? 1 : 0);

      await db.execute(
        `UPDATE expense_categories
         SET name = ?, normalized_name = ?, description = ?, active = ?, updated_at = ?
         WHERE business_id = ? AND id = ?`,
        [newName, newNormalized, newDesc, newActive, now, businessId, id]
      );

      return {
        ...current,
        name: newName,
        normalizedName: newNormalized,
        description: newDesc,
        active: newActive === 1,
        updatedAt: now,
      };
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in update', { error: String(err) });
      return this.fallbackRepo.update(businessId, id, dto);
    }
  }

  async ensureDefaults(businessId: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.ensureDefaults(businessId);

    try {
      const now = getCurrentUtcIsoString();
      for (const def of DEFAULT_EXPENSE_CATEGORIES_DEFINITION) {
        const rows: { count: number }[] = await db.select(
          `SELECT COUNT(*) as count FROM expense_categories
           WHERE business_id = ? AND (system_key = ? OR normalized_name = ?)`,
          [businessId, def.systemKey, normalizeExpenseCategoryName(def.name)]
        );

        if (rows.length > 0 && rows[0].count === 0) {
          const id = generateUuid();
          await db.execute(
            `INSERT INTO expense_categories (
              id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [id, businessId, def.systemKey, def.name, normalizeExpenseCategoryName(def.name), def.description, now, now]
          );
        }
      }
    } catch (err) {
      logger.error('SqliteExpenseCategoryRepository', 'Error in ensureDefaults', { error: String(err) });
      await this.fallbackRepo.ensureDefaults(businessId);
    }
  }
}
