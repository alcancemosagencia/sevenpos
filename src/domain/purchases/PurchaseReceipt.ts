export interface PurchaseReceipt {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  receiptSequence: number;
  receivedByUserId: string;
  receivedByNameSnapshot: string;
  receivedAt: string;
  note: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface PurchaseReceiptItem {
  id: string;
  businessId: string;
  purchaseReceiptId: string;
  purchaseOrderItemId: string;
  productId: string;
  presentationId: string | null;
  receivedQuantity: number; // Scaled integer (scale: 1000) in presentation units
  baseQuantity: number; // Scaled integer (scale: 1000) in base units
  unitCost: number; // Minor currency integer
  lineCostTotal: number; // Minor currency integer
  lotId: string | null;
  lotCodeSnapshot: string | null;
  expirationDateSnapshot: string | null;
  createdAt: string;
}

export interface PurchaseReceiptWithItems extends PurchaseReceipt {
  items: PurchaseReceiptItem[];
}

export interface ReceiveGoodsItemDto {
  purchaseOrderItemId: string;
  receivedQuantity: number; // Scaled integer (scale: 1000) in presentation units
  unitCost: number; // Real received cost in minor currency
  lotCode?: string | null;
  expirationDate?: string | null;
}

export interface ReceiveGoodsDto {
  purchaseOrderId: string;
  receivedByUserId: string;
  receivedByNameSnapshot: string;
  receivedAt?: string;
  note?: string | null;
  idempotencyKey: string;
  items: ReceiveGoodsItemDto[];
}
