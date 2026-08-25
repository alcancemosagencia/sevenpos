import { Product } from '../../catalog/Product';
import { InventoryStockStatus } from '../InventoryStockStatus';
import { CostQuality } from '../InventoryCost';

export interface InventoryProductRow {
  product: Product;
  categoryName?: string | null;
  categoryColor?: string | null;
  currentStock: number; // Scaled integer
  minimumStock: number | null; // Scaled integer
  status: InventoryStockStatus;
  estimatedCost: number | null; // Minor integer
  costQuality: CostQuality;
  lastMovementAt: string | null;
  lotCount: number;
}

export interface InventoryKPIMetrics {
  totalProductsWithStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalMovementsToday: number;
  estimatedTotalInventoryValue: number; // Minor currency integer
}

export interface InventoryQueryRepository {
  listStockTable(params: {
    businessId: string;
    query?: string;
    categoryId?: string;
    status?: 'all' | 'available' | 'low_stock' | 'out_of_stock';
    limit?: number;
    offset?: number;
  }): Promise<{ rows: InventoryProductRow[]; total: number }>;

  getMetrics(businessId: string): Promise<InventoryKPIMetrics>;
}
