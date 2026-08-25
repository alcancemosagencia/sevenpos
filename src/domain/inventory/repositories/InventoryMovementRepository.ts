import { InventoryMovement } from '../InventoryMovement';

export interface RecordMovementParams {
  businessId: string;
  productId: string;
  lotId?: string | null;
  movementType: InventoryMovement['movementType'];
  quantityDelta: number; // Scaled integer
  unitCost?: number | null;
  totalCost?: number | null;
  reasonCode?: InventoryMovement['reasonCode'] | null;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId: string;
  occurredAt?: string;
}

export interface InventoryMovementRepository {
  recordMovement(params: RecordMovementParams): Promise<InventoryMovement>;
  listByProduct(productId: string, businessId: string): Promise<InventoryMovement[]>;
  listMovements(params: {
    businessId: string;
    productId?: string;
    movementType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ movements: InventoryMovement[]; total: number }>;
  getCurrentStock(productId: string, businessId: string): Promise<number>;
  getLotStock(lotId: string, businessId: string): Promise<number>;
}
