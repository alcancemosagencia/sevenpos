import {
  InventoryQueryRepository,
  InventoryProductRow,
  InventoryKPIMetrics,
} from '../../domain/inventory/repositories/InventoryQueryRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { deriveStockStatus } from '../../domain/inventory/InventoryStockStatus';
import { calculateSequentialWAC } from '../../domain/inventory/InventoryCost';

export class InMemoryInventoryQueryRepository implements InventoryQueryRepository {
  constructor(
    private productRepo: ProductRepository,
    private movementRepo: InventoryMovementRepository,
    private lotRepo: InventoryLotRepository
  ) {}

  async listStockTable(params: {
    businessId: string;
    query?: string;
    categoryId?: string;
    status?: 'all' | 'available' | 'low_stock' | 'out_of_stock';
    limit?: number;
    offset?: number;
  }): Promise<{ rows: InventoryProductRow[]; total: number }> {
    const catFilter = params.categoryId && params.categoryId !== 'all' ? params.categoryId : undefined;
    const result = await this.productRepo.list({
      businessId: params.businessId,
      query: params.query,
      categoryId: catFilter,
      status: 'all',
      pageSize: 10000,
    });

    const rows: InventoryProductRow[] = [];

    for (const item of result.items) {
      const prod = item.product;
      const catName = item.category?.name || null;
      const catColor = item.category?.color || null;

      const currentStock = await this.movementRepo.getCurrentStock(prod.id, params.businessId);
      const movements = await this.movementRepo.listByProduct(prod.id, params.businessId);
      const costState = calculateSequentialWAC(movements, prod.costPrice);
      const lots = await this.lotRepo.listByProductWithStock(prod.id, params.businessId);
      const activeLots = lots.filter((l) => l.currentStock > 0);

      const status = deriveStockStatus(currentStock, prod.minimumStock);

      if (params.status && params.status !== 'all') {
        if (params.status === 'available' && status !== 'AVAILABLE') continue;
        if (params.status === 'low_stock' && status !== 'LOW_STOCK') continue;
        if (params.status === 'out_of_stock' && status !== 'OUT_OF_STOCK') continue;
      }

      rows.push({
        product: prod,
        categoryName: catName,
        categoryColor: catColor,
        currentStock,
        minimumStock: prod.minimumStock ?? null,
        status,
        estimatedCost: costState.averageUnitCost,
        costQuality: costState.costQuality,
        lastMovementAt: movements[0]?.occurredAt || null,
        lotCount: activeLots.length,
      });
    }

    const total = rows.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return {
      rows: rows.slice(offset, offset + limit),
      total,
    };
  }

  async getMetrics(businessId: string): Promise<InventoryKPIMetrics> {
    const { rows } = await this.listStockTable({ businessId, limit: 10000 });
    const { movements } = await this.movementRepo.listMovements({ businessId, limit: 10000 });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayMovements = movements.filter((m) => m.occurredAt.startsWith(todayStr));

    let withStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const r of rows) {
      if (r.currentStock > 0) withStock++;
      if (r.status === 'LOW_STOCK') lowStock++;
      if (r.status === 'OUT_OF_STOCK') outOfStock++;

      if (r.currentStock > 0 && r.estimatedCost) {
        totalValue += Math.round((r.currentStock / 1000) * r.estimatedCost);
      }
    }

    return {
      totalProductsWithStock: withStock,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalMovementsToday: todayMovements.length,
      estimatedTotalInventoryValue: totalValue,
    };
  }
}
