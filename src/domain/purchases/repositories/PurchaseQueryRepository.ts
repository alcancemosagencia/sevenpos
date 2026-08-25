export interface PurchaseKPIMetrics {
  openOrdersCount: number;
  pendingReceiptsCount: number;
  receivedThisMonthCount: number;
  purchasesTotalThisMonth: number; // Minor currency integer
}

export interface PurchaseQueryRepository {
  getKPIMetrics(businessId: string): Promise<PurchaseKPIMetrics>;
}
