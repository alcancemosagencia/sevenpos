import {
  InventoryMovementRepository,
  RecordMovementParams,
} from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';

const STORAGE_KEY = 'sevenpos-dev-movements';

export class InMemoryInventoryMovementRepository implements InventoryMovementRepository {
  private movements: InventoryMovement[] = [];

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
          this.movements = JSON.parse(raw);
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.movements));
      } catch {
        // Dev fallback
      }
    }
  }

  async recordMovement(params: RecordMovementParams): Promise<InventoryMovement> {
    const now = new Date().toISOString();

    // Negative stock check
    if (params.quantityDelta < 0) {
      const currentStock = await this.getCurrentStock(params.productId, params.businessId);
      if (currentStock + params.quantityDelta < 0) {
        throw new Error(
          `No puedes registrar una salida mayor al stock disponible (Stock actual: ${currentStock / 1000}, Salida intentada: ${Math.abs(params.quantityDelta) / 1000}).`
        );
      }

      if (params.lotId) {
        const lotStock = await this.getLotStock(params.lotId, params.businessId);
        if (lotStock + params.quantityDelta < 0) {
          throw new Error(
            `No puedes registrar una salida mayor al stock disponible en el lote seleccionado (Stock lote: ${lotStock / 1000}, Salida: ${Math.abs(params.quantityDelta) / 1000}).`
          );
        }
      } else {
        // Output without lot: check if there are lots and ensure unallocated stock is sufficient
        const lotMovements = this.movements.filter(
          (m) => m.businessId === params.businessId && m.productId === params.productId && m.lotId
        );
        const totalLotStock = lotMovements.reduce((acc, m) => acc + m.quantityDelta, 0);
        const unallocatedStock = currentStock - totalLotStock;
        if (unallocatedStock + params.quantityDelta < 0) {
          throw new Error(
            `No puedes registrar una salida sin lote mayor al stock no asignado disponible (Stock sin lote: ${unallocatedStock / 1000}, Salida: ${Math.abs(params.quantityDelta) / 1000}).`
          );
        }
      }
    }

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      businessId: params.businessId,
      productId: params.productId,
      lotId: params.lotId || null,
      movementType: params.movementType,
      quantityDelta: params.quantityDelta,
      unitCost: params.unitCost ?? null,
      totalCost: params.totalCost ?? null,
      reasonCode: params.reasonCode ?? null,
      note: params.note ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      createdByUserId: params.createdByUserId,
      occurredAt: params.occurredAt || now,
      createdAt: now,
    };

    this.movements.push(movement);
    this.saveToDevStorage();
    return movement;
  }

  async listByProduct(productId: string, businessId: string): Promise<InventoryMovement[]> {
    this.loadFromDevStorage();
    return this.movements
      .filter((m) => m.businessId === businessId && m.productId === productId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async listMovements(params: {
    businessId: string;
    productId?: string;
    movementType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ movements: InventoryMovement[]; total: number }> {
    this.loadFromDevStorage();
    let filtered = this.movements.filter((m) => m.businessId === params.businessId);

    if (params.productId) {
      filtered = filtered.filter((m) => m.productId === params.productId);
    }
    if (params.movementType && params.movementType !== 'all') {
      filtered = filtered.filter((m) => m.movementType === params.movementType);
    }

    filtered.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return {
      movements: filtered.slice(offset, offset + limit),
      total,
    };
  }

  async getCurrentStock(productId: string, businessId: string): Promise<number> {
    this.loadFromDevStorage();
    return this.movements
      .filter((m) => m.businessId === businessId && m.productId === productId)
      .reduce((sum, m) => sum + m.quantityDelta, 0);
  }

  async getLotStock(lotId: string, businessId: string): Promise<number> {
    this.loadFromDevStorage();
    return this.movements
      .filter((m) => m.businessId === businessId && m.lotId === lotId)
      .reduce((sum, m) => sum + m.quantityDelta, 0);
  }
}
