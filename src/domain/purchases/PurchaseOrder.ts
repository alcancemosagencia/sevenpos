import { Supplier } from './Supplier';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  productId: string;
  presentationId: string | null;
  productNameSnapshot: string;
  presentationNameSnapshot: string | null;
  baseUnit: string;
  presentationFactor: number;
  orderedQuantity: number; // Scaled integer (scale: 1000) in presentation units
  unitCost: number; // Minor currency integer per presentation unit
  discountTotal: number; // Minor currency integer
  lineTotal: number; // Minor currency integer
  skuSnapshot: string | null;
  barcodeSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  orderNumber: string;
  orderSequence: number;
  supplierId: string;
  status: PurchaseOrderStatus;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  expectedDate: string | null;
  note: string | null;
  createdByUserId: string;
  createdByNameSnapshot: string;
  createdAt: string;
  updatedAt: string;
  orderedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface PurchaseOrderItemDetail extends PurchaseOrderItem {
  receivedQuantity: number; // Scaled integer (scale: 1000)
  pendingQuantity: number; // Scaled integer (scale: 1000)
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: Supplier;
  items: PurchaseOrderItemDetail[];
  receipts: import('./PurchaseReceipt').PurchaseReceiptWithItems[];
}

export interface CreatePurchaseOrderItemDto {
  productId: string;
  presentationId?: string | null;
  productNameSnapshot: string;
  presentationNameSnapshot?: string | null;
  baseUnit: string;
  presentationFactor: number;
  orderedQuantity: number; // Scaled: 1000
  unitCost: number; // Minor currency integer
  discountTotal?: number;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  currencyCode: string;
  expectedDate?: string | null;
  note?: string | null;
  discountTotal?: number;
  taxTotal?: number;
  items: CreatePurchaseOrderItemDto[];
  status?: 'DRAFT' | 'ORDERED';
}

export interface UpdatePurchaseOrderDraftDto {
  supplierId?: string;
  expectedDate?: string | null;
  note?: string | null;
  discountTotal?: number;
  taxTotal?: number;
  items?: CreatePurchaseOrderItemDto[];
}
