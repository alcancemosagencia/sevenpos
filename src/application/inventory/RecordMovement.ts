import {
  InventoryMovementRepository,
  RecordMovementParams,
} from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { validateQuantityForUnit } from '../../domain/common/quantity/Quantity';

export interface RecordMovementInput {
  businessId: string;
  productId: string;
  movementType: InventoryMovement['movementType'];
  quantityDelta: number; // Scaled integer (e.g. 10000 = 10 units)
  unitCost?: number | null;
  totalCost?: number | null;
  reasonCode?: InventoryMovement['reasonCode'] | null;
  note?: string | null;
  lotCode?: string | null;
  expirationDate?: string | null;
  lotId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId: string;
  occurredAt?: string;
}

export class RecordMovement {
  constructor(
    private movementRepo: InventoryMovementRepository,
    private lotRepo: InventoryLotRepository,
    private productRepo: ProductRepository
  ) {}

  async execute(input: RecordMovementInput): Promise<InventoryMovement> {
    if (!input.businessId) throw new Error('El ID del negocio es requerido.');
    if (!input.productId) throw new Error('El ID del producto es requerido.');
    if (!input.createdByUserId) throw new Error('El usuario es requerido.');

    // 1. Verify product exists in business
    const product = await this.productRepo.getById(input.productId, input.businessId);
    if (!product) {
      throw new Error('El producto no existe o no pertenece a este negocio.');
    }

    // 2. Validate quantity delta for product's base unit
    const absQty = Math.abs(input.quantityDelta);
    const valResult = validateQuantityForUnit(absQty, product.baseUnit);
    if (!valResult.valid) {
      throw new Error(valResult.error || 'Cantidad inválida para la unidad del producto.');
    }

    let finalLotId = input.lotId || null;

    // 3. If lotCode or expirationDate is provided on incoming movement, create/find lot
    if (!finalLotId && (input.lotCode || input.expirationDate)) {
      const lot = await this.lotRepo.createLot({
        businessId: input.businessId,
        productId: input.productId,
        lotCode: input.lotCode || null,
        expirationDate: input.expirationDate || null,
      });
      finalLotId = lot.id;
    }

    // 4. Calculate total cost if unit cost is provided
    let calculatedTotalCost = input.totalCost;
    if (
      calculatedTotalCost === undefined &&
      input.unitCost !== undefined &&
      input.unitCost !== null
    ) {
      calculatedTotalCost = Math.round((absQty / 1000) * input.unitCost);
    }

    const params: RecordMovementParams = {
      businessId: input.businessId,
      productId: input.productId,
      lotId: finalLotId,
      movementType: input.movementType,
      quantityDelta: input.quantityDelta,
      unitCost: input.unitCost,
      totalCost: calculatedTotalCost,
      reasonCode: input.reasonCode,
      note: input.note,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdByUserId: input.createdByUserId,
      occurredAt: input.occurredAt,
    };

    return this.movementRepo.recordMovement(params);
  }
}
