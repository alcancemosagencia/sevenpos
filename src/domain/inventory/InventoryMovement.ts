export type MovementType =
  | 'OPENING'
  | 'ENTRY'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'WASTE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export type ReasonCode =
  | 'PHYSICAL_COUNT'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'LOST'
  | 'INTERNAL_USE'
  | 'DATA_CORRECTION'
  | 'OTHER';

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  lotId?: string | null;
  movementType: MovementType;
  quantityDelta: number; // Scaled integer (positive for in, negative for out)
  unitCost?: number | null; // Minor integer of currency
  totalCost?: number | null; // Minor integer of currency
  reasonCode?: ReasonCode | null;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId: string;
  occurredAt: string; // ISO String UTC
  createdAt: string; // ISO String UTC
}
