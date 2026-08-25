import {
  InventoryLotRepository,
  CreateLotParams,
} from '../../domain/inventory/repositories/InventoryLotRepository';
import { InventoryLot, InventoryLotWithStock } from '../../domain/inventory/InventoryLot';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';

const STORAGE_KEY = 'sevenpos-dev-lots';

export class InMemoryInventoryLotRepository implements InventoryLotRepository {
  private lots: InventoryLot[] = [];

  constructor(private movementRepo: InventoryMovementRepository) {
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
          this.lots = JSON.parse(raw);
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lots));
      } catch {
        // Dev fallback
      }
    }
  }

  async createLot(params: CreateLotParams): Promise<InventoryLot> {
    const now = new Date().toISOString();

    // Validate uniqueness of lot_code for product/business if provided
    if (params.lotCode) {
      const existing = await this.findByCode(params.productId, params.lotCode, params.businessId);
      if (existing) {
        return existing; // Reuse existing lot
      }
    }

    const lot: InventoryLot = {
      id: `lot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      businessId: params.businessId,
      productId: params.productId,
      lotCode: params.lotCode ? params.lotCode.trim().toUpperCase() : null,
      expirationDate: params.expirationDate || null,
      createdAt: now,
      updatedAt: now,
    };

    this.lots.push(lot);
    this.saveToDevStorage();
    return lot;
  }

  async getById(id: string, businessId: string): Promise<InventoryLot | null> {
    const found = this.lots.find((l) => l.id === id && l.businessId === businessId);
    return found ? { ...found } : null;
  }

  async findByCode(
    productId: string,
    lotCode: string,
    businessId: string
  ): Promise<InventoryLot | null> {
    const normalized = lotCode.trim().toUpperCase();
    const found = this.lots.find(
      (l) =>
        l.businessId === businessId &&
        l.productId === productId &&
        l.lotCode === normalized
    );
    return found ? { ...found } : null;
  }

  async listByProductWithStock(productId: string, businessId: string): Promise<InventoryLotWithStock[]> {
    const productLots = this.lots.filter(
      (l) => l.businessId === businessId && l.productId === productId
    );

    const now = new Date();
    const result: InventoryLotWithStock[] = [];

    for (const lot of productLots) {
      const currentStock = await this.movementRepo.getLotStock(lot.id, businessId);
      let status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' = 'ACTIVE';

      if (currentStock <= 0) {
        status = 'DEPLETED';
      } else if (lot.expirationDate) {
        const expDate = new Date(lot.expirationDate);
        if (expDate < now) {
          status = 'EXPIRED';
        }
      }

      result.push({
        ...lot,
        currentStock,
        status,
      });
    }

    return result.sort((a, b) => {
      // Sort active first, then closest expiration
      if (a.status !== b.status) {
        if (a.status === 'ACTIVE') return -1;
        if (b.status === 'ACTIVE') return 1;
      }
      return (a.expirationDate || '9999').localeCompare(b.expirationDate || '9999');
    });
  }

  async listExpiringLots(businessId: string, daysThreshold: number = 30): Promise<InventoryLotWithStock[]> {
    const bizLots = this.lots.filter((l) => l.businessId === businessId && l.expirationDate);
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);

    const result: InventoryLotWithStock[] = [];

    for (const lot of bizLots) {
      const currentStock = await this.movementRepo.getLotStock(lot.id, businessId);
      if (currentStock > 0 && lot.expirationDate) {
        const expDate = new Date(lot.expirationDate);
        if (expDate <= thresholdDate) {
          result.push({
            ...lot,
            currentStock,
            status: expDate < now ? 'EXPIRED' : 'ACTIVE',
          });
        }
      }
    }

    return result.sort((a, b) => (a.expirationDate || '').localeCompare(b.expirationDate || ''));
  }
}
