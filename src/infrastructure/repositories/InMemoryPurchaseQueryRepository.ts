import {
  PurchaseKPIMetrics,
  PurchaseQueryRepository,
} from '../../domain/purchases/repositories/PurchaseQueryRepository';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';

export class InMemoryPurchaseQueryRepository implements PurchaseQueryRepository {
  constructor(private purchaseOrderRepo: PurchaseOrderRepository) {}

  async getKPIMetrics(businessId: string): Promise<PurchaseKPIMetrics> {
    const orders = await this.purchaseOrderRepo.list(businessId);
    const now = new Date();
    const currentYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    let openOrdersCount = 0;
    let pendingReceiptsCount = 0;
    let receivedThisMonthCount = 0;
    let purchasesTotalThisMonth = 0;

    for (const ord of orders) {
      if (
        ord.status === 'DRAFT' ||
        ord.status === 'ORDERED' ||
        ord.status === 'PARTIALLY_RECEIVED'
      ) {
        openOrdersCount++;
      }
      if (ord.status === 'ORDERED' || ord.status === 'PARTIALLY_RECEIVED') {
        pendingReceiptsCount++;
      }
      if (ord.status === 'RECEIVED' && ord.completedAt?.startsWith(currentYearMonth)) {
        receivedThisMonthCount++;
      }

      // Sum receipts
      const details = await this.purchaseOrderRepo.findWithDetailsById(businessId, ord.id);
      if (details) {
        for (const r of details.receipts) {
          if (r.receivedAt.startsWith(currentYearMonth)) {
            for (const item of r.items) {
              purchasesTotalThisMonth += item.lineCostTotal;
            }
          }
        }
      }
    }

    return {
      openOrdersCount,
      pendingReceiptsCount,
      receivedThisMonthCount,
      purchasesTotalThisMonth,
    };
  }
}
