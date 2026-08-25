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
import { InMemoryCategoryRepository } from './InMemoryCategoryRepository';
import { InMemoryProductPresentationRepository } from './InMemoryProductPresentationRepository';

const STORAGE_KEY = 'sevenpos-dev-products';

export class InMemoryProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map();
  private categoryRepo: InMemoryCategoryRepository;
  private presentationRepo: InMemoryProductPresentationRepository;

  constructor(
    categoryRepo?: InMemoryCategoryRepository,
    presentationRepo?: InMemoryProductPresentationRepository
  ) {
    this.categoryRepo = categoryRepo || new InMemoryCategoryRepository();
    this.presentationRepo = presentationRepo || new InMemoryProductPresentationRepository();
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
          const list: Product[] = JSON.parse(raw);
          list.forEach((p) => this.products.set(`${p.businessId}:${p.id}`, p));
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const list = Array.from(this.products.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Dev fallback
      }
    }
  }

  async getById(id: string, businessId: string): Promise<Product | null> {
    this.loadFromDevStorage();
    const p = this.products.get(`${businessId}:${id}`);
    return p ? { ...p } : null;
  }

  async getDetailById(id: string, businessId: string): Promise<ProductDetailWithPresentations | null> {
    this.loadFromDevStorage();
    const product = await this.getById(id, businessId);
    if (!product) return null;

    let category: Category | null = null;
    if (product.categoryId) {
      category = await this.categoryRepo.getById(product.categoryId, businessId);
    }

    const presentations = await this.presentationRepo.listByProduct(id, businessId);

    return {
      product,
      category,
      presentations,
    };
  }

  async findBySku(sku: string, businessId: string): Promise<Product | null> {
    this.loadFromDevStorage();
    const clean = sku.trim().toUpperCase();
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.sku && p.sku.trim().toUpperCase() === clean) {
        return { ...p };
      }
    }
    return null;
  }

  async findByBarcode(barcode: string, businessId: string): Promise<Product | null> {
    this.loadFromDevStorage();
    const clean = barcode.trim();
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.barcode && p.barcode.trim() === clean) {
        return { ...p };
      }
    }
    return null;
  }

  async list(params: ProductFilterParams): Promise<ProductListResult> {
    this.loadFromDevStorage();
    const filtered: Product[] = [];
    const queryTerm = params.query ? params.query.trim().toLowerCase() : null;

    for (const p of this.products.values()) {
      if (p.businessId !== params.businessId) continue;

      // Status
      if (params.status === 'active' && !p.active) continue;
      if (params.status === 'inactive' && p.active) continue;

      // Category
      if (params.categoryId) {
        if (params.categoryId === 'uncategorized' && p.categoryId) continue;
        if (params.categoryId !== 'uncategorized' && p.categoryId !== params.categoryId) continue;
      }

      // Search term
      if (queryTerm) {
        const matchName = p.name.toLowerCase().includes(queryTerm);
        const matchSku = p.sku?.toLowerCase().includes(queryTerm) ?? false;
        const matchBarcode = p.barcode?.toLowerCase().includes(queryTerm) ?? false;

        // Also check if any presentation matches
        let matchPres = false;
        const presentations = await this.presentationRepo.listByProduct(p.id, p.businessId);
        for (const pres of presentations) {
          if (
            pres.name.toLowerCase().includes(queryTerm) ||
            (pres.sku && pres.sku.toLowerCase().includes(queryTerm)) ||
            (pres.barcode && pres.barcode.toLowerCase().includes(queryTerm))
          ) {
            matchPres = true;
            break;
          }
        }

        if (!matchName && !matchSku && !matchBarcode && !matchPres) {
          continue;
        }
      }

      // Has presentations
      if (params.hasPresentations !== undefined) {
        const presCount = await this.presentationRepo.countByProduct(p.id, p.businessId);
        if (params.hasPresentations && presCount === 0) continue;
        if (!params.hasPresentations && presCount > 0) continue;
      }

      filtered.push(p);
    }

    // Sort
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let cmp: number;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'price') {
        cmp = a.salePrice - b.salePrice;
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const paged = filtered.slice(offset, offset + pageSize);

    const items: ProductListItem[] = [];
    for (const prod of paged) {
      let category: Category | null = null;
      if (prod.categoryId) {
        category = await this.categoryRepo.getById(prod.categoryId, prod.businessId);
      }
      const presentationCount = await this.presentationRepo.countByProduct(prod.id, prod.businessId);
      items.push({
        product: { ...prod },
        category,
        presentationCount,
      });
    }

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getKpiSummary(businessId: string): Promise<ProductKpiSummary> {
    let activeProducts = 0;
    let uncategorizedProducts = 0;
    let productsWithPresentations = 0;

    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.active) {
        activeProducts++;
        if (!p.categoryId) {
          uncategorizedProducts++;
        }
        const presCount = await this.presentationRepo.countByProduct(p.id, businessId);
        if (presCount > 0) {
          productsWithPresentations++;
        }
      }
    }

    const totalCategories = await this.categoryRepo.countByBusiness(businessId);

    return {
      activeProducts,
      totalCategories,
      uncategorizedProducts,
      productsWithPresentations,
    };
  }

  async save(product: Product): Promise<void> {
    this.products.set(`${product.businessId}:${product.id}`, { ...product });
    this.saveToDevStorage();
  }

  async update(product: Product): Promise<void> {
    this.products.set(`${product.businessId}:${product.id}`, { ...product });
    this.saveToDevStorage();
  }

  async deactivate(id: string, businessId: string): Promise<void> {
    const p = this.products.get(`${businessId}:${id}`);
    if (p) {
      p.active = false;
      p.updatedAt = new Date().toISOString();
      this.products.set(`${businessId}:${id}`, p);
      this.saveToDevStorage();
    }
  }

  async activate(id: string, businessId: string): Promise<void> {
    const p = this.products.get(`${businessId}:${id}`);
    if (p) {
      p.active = true;
      p.updatedAt = new Date().toISOString();
      this.products.set(`${businessId}:${id}`, p);
      this.saveToDevStorage();
    }
  }

  async countByBusiness(businessId: string): Promise<number> {
    let count = 0;
    for (const p of this.products.values()) {
      if (p.businessId === businessId) count++;
    }
    return count;
  }

  async countByCategory(categoryId: string, businessId: string): Promise<number> {
    let count = 0;
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.categoryId === categoryId) count++;
    }
    return count;
  }

  clear() {
    this.products.clear();
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Dev fallback
      }
    }
  }
}
