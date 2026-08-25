import { InventoryLot, InventoryLotWithStock } from '../InventoryLot';

export interface CreateLotParams {
  businessId: string;
  productId: string;
  lotCode?: string | null;
  expirationDate?: string | null;
}

export interface InventoryLotRepository {
  createLot(params: CreateLotParams): Promise<InventoryLot>;
  getById(id: string, businessId: string): Promise<InventoryLot | null>;
  findByCode(productId: string, lotCode: string, businessId: string): Promise<InventoryLot | null>;
  listByProductWithStock(productId: string, businessId: string): Promise<InventoryLotWithStock[]>;
  listExpiringLots(businessId: string, daysThreshold?: number): Promise<InventoryLotWithStock[]>;
}
