import {
  InventoryMovementRepository,
} from '../../domain/inventory/repositories/InventoryMovementRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { Product } from '../../domain/catalog/Product';

export interface MovementWithProduct extends InventoryMovement {
  productName: string;
  productSku: string | null;
  productBaseUnit: string;
}

export interface ListMovementsParams {
  businessId: string;
  productId?: string;
  movementType?: string;
  limit?: number;
  offset?: number;
}

export class ListMovements {
  constructor(
    private movementRepo: InventoryMovementRepository,
    private productRepo: ProductRepository
  ) {}

  async execute(params: ListMovementsParams): Promise<{
    movements: MovementWithProduct[];
    total: number;
  }> {
    const result = await this.movementRepo.listMovements(params);

    // Cache products in batch
    const productIds = Array.from(new Set(result.movements.map((m) => m.productId)));
    const productMap = new Map<string, Product>();

    await Promise.all(
      productIds.map(async (id) => {
        const prod = await this.productRepo.getById(id, params.businessId);
        if (prod) productMap.set(id, prod);
      })
    );

    const movementsWithProduct: MovementWithProduct[] = result.movements.map((m) => {
      const prod = productMap.get(m.productId);
      return {
        ...m,
        productName: prod ? prod.name : 'Producto no disponible',
        productSku: prod?.sku || null,
        productBaseUnit: prod?.baseUnit || 'UNIT',
      };
    });

    return {
      movements: movementsWithProduct,
      total: result.total,
    };
  }
}
