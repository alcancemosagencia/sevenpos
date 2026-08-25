import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { CategoryRepository } from '../../domain/catalog/CategoryRepository';
import { Product } from '../../domain/catalog/Product';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { InventoryLotWithStock } from '../../domain/inventory/InventoryLot';
import { InventoryCostState, calculateSequentialWAC } from '../../domain/inventory/InventoryCost';
import { InventoryStockStatus, deriveStockStatus } from '../../domain/inventory/InventoryStockStatus';

export interface ProductInventoryDetail {
  product: Product;
  categoryName: string | null;
  categoryColor: string | null;
  currentStock: number; // Scaled integer
  minimumStock: number | null; // Scaled integer
  status: InventoryStockStatus;
  costState: InventoryCostState;
  lots: InventoryLotWithStock[];
  unallocatedStock: number; // Scaled integer
  recentMovements: InventoryMovement[];
}

export class GetProductStock {
  constructor(
    private productRepo: ProductRepository,
    private categoryRepo: CategoryRepository,
    private movementRepo: InventoryMovementRepository,
    private lotRepo: InventoryLotRepository
  ) {}

  async execute(productId: string, businessId: string): Promise<ProductInventoryDetail | null> {
    const product = await this.productRepo.getById(productId, businessId);
    if (!product) return null;

    let categoryName: string | null = null;
    let categoryColor: string | null = null;
    if (product.categoryId) {
      const cat = await this.categoryRepo.getById(product.categoryId, businessId);
      if (cat) {
        categoryName = cat.name;
        categoryColor = cat.color || null;
      }
    }

    const currentStock = await this.movementRepo.getCurrentStock(productId, businessId);
    const movements = await this.movementRepo.listByProduct(productId, businessId);
    const costState = calculateSequentialWAC(movements, product.costPrice);
    const lots = await this.lotRepo.listByProductWithStock(productId, businessId);

    const totalLotStock = lots.reduce((acc, l) => acc + l.currentStock, 0);
    const unallocatedStock = Math.max(0, currentStock - totalLotStock);
    const status = deriveStockStatus(currentStock, product.minimumStock);

    return {
      product,
      categoryName,
      categoryColor,
      currentStock,
      minimumStock: product.minimumStock ?? null,
      status,
      costState,
      lots,
      unallocatedStock,
      recentMovements: movements.slice(0, 50),
    };
  }
}
