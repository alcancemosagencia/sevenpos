import { CategoryRepository } from '../../domain/catalog/CategoryRepository';
import { Category } from '../../domain/catalog/Category';

const STORAGE_KEY = 'sevenpos-dev-categories';

export class InMemoryCategoryRepository implements CategoryRepository {
  private categories: Map<string, Category> = new Map();

  constructor() {
    this.loadFromDevStorage();
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: Category[] = JSON.parse(raw);
          list.forEach((c) => this.categories.set(`${c.businessId}:${c.id}`, c));
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const list = Array.from(this.categories.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Dev fallback
      }
    }
  }

  async getById(id: string, businessId: string): Promise<Category | null> {
    const cat = this.categories.get(`${businessId}:${id}`);
    return cat ? { ...cat } : null;
  }

  async findByName(name: string, businessId: string): Promise<Category | null> {
    const clean = name.trim().toLowerCase();
    for (const cat of this.categories.values()) {
      if (cat.businessId === businessId && cat.name.trim().toLowerCase() === clean) {
        return { ...cat };
      }
    }
    return null;
  }

  async list(businessId: string, activeOnly = false): Promise<Category[]> {
    const result: Category[] = [];
    for (const cat of this.categories.values()) {
      if (cat.businessId === businessId) {
        if (!activeOnly || cat.active) {
          result.push({ ...cat });
        }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(category: Category): Promise<void> {
    this.categories.set(`${category.businessId}:${category.id}`, { ...category });
    this.saveToDevStorage();
  }

  async update(category: Category): Promise<void> {
    this.categories.set(`${category.businessId}:${category.id}`, { ...category });
    this.saveToDevStorage();
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    const cat = this.categories.get(`${businessId}:${id}`);
    if (cat) {
      cat.active = false;
      cat.updatedAt = new Date().toISOString();
      this.categories.set(`${businessId}:${id}`, cat);
      this.saveToDevStorage();
    }
  }

  async countByBusiness(businessId: string): Promise<number> {
    let count = 0;
    for (const cat of this.categories.values()) {
      if (cat.businessId === businessId) count++;
    }
    return count;
  }

  clear() {
    this.categories.clear();
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Dev fallback
      }
    }
  }
}
