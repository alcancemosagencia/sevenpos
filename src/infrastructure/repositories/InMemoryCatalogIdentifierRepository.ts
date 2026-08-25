import { CatalogIdentifierRepository } from '../../domain/catalog/CatalogIdentifierRepository';
import { CatalogIdentifier, IdentifierType } from '../../domain/catalog/CatalogIdentifier';

const STORAGE_KEY = 'sevenpos-dev-catalog-identifiers';

export class InMemoryCatalogIdentifierRepository implements CatalogIdentifierRepository {
  private identifiers: Map<string, CatalogIdentifier> = new Map();

  constructor() {
    this.loadFromDevStorage();
  }

  private getKey(businessId: string, type: IdentifierType, value: string): string {
    return `${businessId}:${type}:${value.trim().toUpperCase()}`;
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: CatalogIdentifier[] = JSON.parse(raw);
          list.forEach((i) => this.identifiers.set(this.getKey(i.businessId, i.identifierType, i.identifierValue), i));
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const list = Array.from(this.identifiers.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Dev fallback
      }
    }
  }

  async findIdentifier(businessId: string, type: IdentifierType, value: string): Promise<CatalogIdentifier | null> {
    const key = this.getKey(businessId, type, value);
    const found = this.identifiers.get(key);
    return found ? { ...found } : null;
  }

  async registerIdentifier(identifier: CatalogIdentifier): Promise<void> {
    const key = this.getKey(identifier.businessId, identifier.identifierType, identifier.identifierValue);
    this.identifiers.set(key, { ...identifier });
    this.saveToDevStorage();
  }

  async updateIdentifier(businessId: string, ownerId: string, type: IdentifierType, newValue: string): Promise<void> {
    // Remove old identifiers of this owner and type
    for (const [key, item] of this.identifiers.entries()) {
      if (item.businessId === businessId && item.ownerId === ownerId && item.identifierType === type) {
        this.identifiers.delete(key);
      }
    }

    if (newValue && newValue.trim()) {
      const id = crypto.randomUUID();
      const identifier: CatalogIdentifier = {
        id,
        businessId,
        identifierType: type,
        identifierValue: newValue.trim(),
        ownerType: 'PRODUCT',
        ownerId,
        createdAt: new Date().toISOString(),
      };
      this.identifiers.set(this.getKey(businessId, type, newValue), identifier);
    }
    this.saveToDevStorage();
  }

  async removeIdentifiersByOwner(businessId: string, ownerId: string): Promise<void> {
    for (const [key, item] of this.identifiers.entries()) {
      if (item.businessId === businessId && item.ownerId === ownerId) {
        this.identifiers.delete(key);
      }
    }
    this.saveToDevStorage();
  }

  clear() {
    this.identifiers.clear();
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Dev fallback
      }
    }
  }
}
