import {
  ExpenseCategory,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  DEFAULT_EXPENSE_CATEGORIES_DEFINITION,
  normalizeExpenseCategoryName,
} from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

const STORAGE_KEY = 'sevenpos-dev-expense-categories';

export class InMemoryExpenseCategoryRepository implements ExpenseCategoryRepository {
  private categories: ExpenseCategory[] = [];

  constructor(initial: ExpenseCategory[] = []) {
    this.categories = [...initial];
    this.loadFromStorage();
  }

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.categories = JSON.parse(raw);
        }
      } catch {
        // Fallback to memory
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.categories));
      } catch {
        // Fallback
      }
    }
  }

  async findById(businessId: string, id: string): Promise<ExpenseCategory | null> {
    this.loadFromStorage();
    return this.categories.find((c) => c.businessId === businessId && c.id === id) || null;
  }

  async findByNormalizedName(businessId: string, normalizedName: string): Promise<ExpenseCategory | null> {
    this.loadFromStorage();
    return (
      this.categories.find(
        (c) => c.businessId === businessId && c.normalizedName === normalizedName
      ) || null
    );
  }

  async findBySystemKey(businessId: string, systemKey: string): Promise<ExpenseCategory | null> {
    this.loadFromStorage();
    return (
      this.categories.find(
        (c) => c.businessId === businessId && c.systemKey === systemKey
      ) || null
    );
  }

  async list(businessId: string, includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    this.loadFromStorage();
    await this.ensureDefaults(businessId);
    return this.categories
      .filter((c) => c.businessId === businessId && (includeInactive || c.active))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  async create(businessId: string, dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    this.loadFromStorage();
    const now = getCurrentUtcIsoString();
    const category: ExpenseCategory = {
      id: generateUuid(),
      businessId,
      systemKey: dto.systemKey || null,
      name: dto.name,
      normalizedName: normalizeExpenseCategoryName(dto.name),
      description: dto.description || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(category);
    this.saveToStorage();
    return category;
  }

  async update(businessId: string, id: string, dto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    this.loadFromStorage();
    const index = this.categories.findIndex((c) => c.businessId === businessId && c.id === id);
    if (index === -1) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND: Categoría no encontrada.');
    }

    const current = this.categories[index];
    const now = getCurrentUtcIsoString();

    const updated: ExpenseCategory = {
      ...current,
      name: dto.name !== undefined ? dto.name : current.name,
      normalizedName:
        dto.name !== undefined ? normalizeExpenseCategoryName(dto.name) : current.normalizedName,
      description: dto.description !== undefined ? dto.description : current.description,
      active: dto.active !== undefined ? dto.active : current.active,
      updatedAt: now,
    };

    this.categories[index] = updated;
    this.saveToStorage();
    return updated;
  }

  async ensureDefaults(businessId: string): Promise<void> {
    this.loadFromStorage();
    let modified = false;
    const now = getCurrentUtcIsoString();

    for (const def of DEFAULT_EXPENSE_CATEGORIES_DEFINITION) {
      const existsBySystemKey = this.categories.some(
        (c) => c.businessId === businessId && c.systemKey === def.systemKey
      );

      if (!existsBySystemKey) {
        const normalized = normalizeExpenseCategoryName(def.name);
        const existsByNormalized = this.categories.some(
          (c) => c.businessId === businessId && c.normalizedName === normalized
        );

        if (!existsByNormalized) {
          this.categories.push({
            id: generateUuid(),
            businessId,
            systemKey: def.systemKey,
            name: def.name,
            normalizedName: normalized,
            description: def.description,
            active: true,
            createdAt: now,
            updatedAt: now,
          });
          modified = true;
        }
      }
    }

    if (modified) {
      this.saveToStorage();
    }
  }
}
