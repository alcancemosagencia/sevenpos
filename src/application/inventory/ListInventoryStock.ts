import {
  InventoryQueryRepository,
  InventoryProductRow,
  InventoryKPIMetrics,
} from '../../domain/inventory/repositories/InventoryQueryRepository';

export interface ListInventoryStockParams {
  businessId: string;
  query?: string;
  categoryId?: string;
  status?: 'all' | 'available' | 'low_stock' | 'out_of_stock';
  limit?: number;
  offset?: number;
}

export class ListInventoryStock {
  constructor(private queryRepo: InventoryQueryRepository) {}

  async execute(params: ListInventoryStockParams): Promise<{
    rows: InventoryProductRow[];
    total: number;
    metrics: InventoryKPIMetrics;
  }> {
    const [tableResult, metrics] = await Promise.all([
      this.queryRepo.listStockTable(params),
      this.queryRepo.getMetrics(params.businessId),
    ]);

    return {
      rows: tableResult.rows,
      total: tableResult.total,
      metrics,
    };
  }
}
