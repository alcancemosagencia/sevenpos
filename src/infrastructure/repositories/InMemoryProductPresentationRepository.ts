import { ProductPresentationRepository } from '../../domain/catalog/ProductPresentationRepository';
import { ProductPresentation } from '../../domain/catalog/ProductPresentation';

const STORAGE_KEY = 'sevenpos-dev-presentations';

export class InMemoryProductPresentationRepository implements ProductPresentationRepository {
  private presentations: Map<string, ProductPresentation> = new Map();

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
          const list: ProductPresentation[] = JSON.parse(raw);
          list.forEach((p) => this.presentations.set(`${p.businessId}:${p.id}`, p));
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const list = Array.from(this.presentations.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Dev fallback
      }
    }
  }

  async getById(id: string, businessId: string): Promise<ProductPresentation | null> {
    this.loadFromDevStorage();
    const p = this.presentations.get(`${businessId}:${id}`);
    return p ? { ...p } : null;
  }

  async listByProduct(productId: string, businessId: string, activeOnly = false): Promise<ProductPresentation[]> {
    this.loadFromDevStorage();
    const result: ProductPresentation[] = [];
    for (const p of this.presentations.values()) {
      if (p.businessId === businessId && p.productId === productId) {
        if (!activeOnly || p.active) {
          result.push({ ...p });
        }
      }
    }
    return result.sort((a, b) => a.unitFactor - b.unitFactor);
  }

  async findBySku(sku: string, businessId: string): Promise<ProductPresentation | null> {
    this.loadFromDevStorage();
    const clean = sku.trim().toUpperCase();
    for (const p of this.presentations.values()) {
      if (p.businessId === businessId && p.sku && p.sku.trim().toUpperCase() === clean) {
        return { ...p };
      }
    }
    return null;
  }

  async findByBarcode(barcode: string, businessId: string): Promise<ProductPresentation | null> {
    this.loadFromDevStorage();
    const clean = barcode.trim();
    for (const p of this.presentations.values()) {
      if (p.businessId === businessId && p.barcode && p.barcode.trim() === clean) {
        return { ...p };
      }
    }
    return null;
  }

  async save(presentation: ProductPresentation): Promise<void> {
    this.presentations.set(`${presentation.businessId}:${presentation.id}`, { ...presentation });
    this.saveToDevStorage();
  }

  async update(presentation: ProductPresentation): Promise<void> {
    this.presentations.set(`${presentation.businessId}:${presentation.id}`, { ...presentation });
    this.saveToDevStorage();
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    const p = this.presentations.get(`${businessId}:${id}`);
    if (p) {
      p.active = false;
      p.updatedAt = new Date().toISOString();
      this.presentations.set(`${businessId}:${id}`, p);
      this.saveToDevStorage();
    }
  }

  async activate(id: string, businessId: string): Promise<void> {
    const p = this.presentations.get(`${businessId}:${id}`);
    if (p) {
      p.active = true;
      p.updatedAt = new Date().toISOString();
      this.presentations.set(`${businessId}:${id}`, p);
      this.saveToDevStorage();
    }
  }

  async countByProduct(productId: string, businessId: string): Promise<number> {
    let count = 0;
    for (const p of this.presentations.values()) {
      if (p.businessId === businessId && p.productId === productId && p.active) count++;
    }
    return count;
  }

  clear() {
    this.presentations.clear();
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Dev fallback
      }
    }
  }
}
