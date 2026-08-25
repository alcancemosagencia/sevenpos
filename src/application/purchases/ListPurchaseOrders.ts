import { PurchaseOrder } from '../../domain/purchases/PurchaseOrder';
import {
  PurchaseOrderRepository,
  ListPurchaseOrdersOptions,
} from '../../domain/purchases/repositories/PurchaseOrderRepository';

export class ListPurchaseOrders {
  constructor(private orderRepo: PurchaseOrderRepository) {}

  async execute(
    businessId: string,
    options?: ListPurchaseOrdersOptions
  ): Promise<PurchaseOrder[]> {
    return this.orderRepo.list(businessId, options);
  }
}
