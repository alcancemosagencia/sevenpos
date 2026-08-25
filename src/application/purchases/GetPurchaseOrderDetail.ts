import {
  PurchaseOrder,
  PurchaseOrderWithDetails,
} from '../../domain/purchases/PurchaseOrder';
import {
  PurchaseOrderRepository,
  ListPurchaseOrdersOptions,
} from '../../domain/purchases/repositories/PurchaseOrderRepository';

export class GetPurchaseOrderDetail {
  constructor(private purchaseOrderRepo: PurchaseOrderRepository) {}

  async execute(
    businessId: string,
    orderId: string
  ): Promise<PurchaseOrderWithDetails | null> {
    return this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
  }
}

export class ListPurchaseOrders {
  constructor(private purchaseOrderRepo: PurchaseOrderRepository) {}

  async execute(
    businessId: string,
    options?: ListPurchaseOrdersOptions
  ): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepo.list(businessId, options);
  }
}
