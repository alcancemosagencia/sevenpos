import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderWithDetails,
} from '../PurchaseOrder';
import { PurchaseReceiptWithItems, ReceiveGoodsDto } from '../PurchaseReceipt';

export interface ListPurchaseOrdersOptions {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PurchaseOrderRepository {
  findById(businessId: string, id: string): Promise<PurchaseOrder | null>;
  findWithDetailsById(businessId: string, id: string): Promise<PurchaseOrderWithDetails | null>;
  list(businessId: string, options?: ListPurchaseOrdersOptions): Promise<PurchaseOrder[]>;
  create(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails>;
  updateDraft(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails>;
  updateStatus(
    businessId: string,
    id: string,
    status: PurchaseOrderStatus,
    timestamp?: string
  ): Promise<void>;
  receiveGoodsTransaction(
    businessId: string,
    dto: ReceiveGoodsDto
  ): Promise<PurchaseReceiptWithItems>;
  getReceiptById(
    businessId: string,
    receiptId: string
  ): Promise<PurchaseReceiptWithItems | null>;
  listReceiptsByOrder(
    businessId: string,
    purchaseOrderId: string
  ): Promise<PurchaseReceiptWithItems[]>;
}
