import {
  CreatePurchaseOrderDto,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderWithDetails,
} from '../../domain/purchases/PurchaseOrder';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { QUANTITY_SCALE } from '../../domain/common/quantity/Quantity';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

export class CreatePurchaseOrder {
  constructor(
    private purchaseOrderRepo: PurchaseOrderRepository,
    private supplierRepo: SupplierRepository
  ) {}

  async execute(
    businessId: string,
    dto: CreatePurchaseOrderDto,
    userId: string,
    userName: string
  ): Promise<PurchaseOrderWithDetails> {
    if (!dto.supplierId) {
      throw new Error('El proveedor es obligatorio.');
    }

    const supplier = await this.supplierRepo.findById(businessId, dto.supplierId);
    if (!supplier) {
      throw new Error('Proveedor no encontrado.');
    }
    if (!supplier.active) {
      throw new Error('El proveedor seleccionado se encuentra inactivo.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new Error('La orden de compra debe contener al menos un producto.');
    }

    const now = getCurrentTimestamp();
    const orderId = generateUUID();
    const status = dto.status || 'DRAFT';

    let subtotal = 0;
    const discountTotal = dto.discountTotal || 0;
    const taxTotal = dto.taxTotal || 0;

    const items: PurchaseOrderItem[] = dto.items.map((itemDto) => {
      if (itemDto.orderedQuantity <= 0) {
        throw new Error(`La cantidad para "${itemDto.productNameSnapshot}" debe ser mayor a 0.`);
      }
      if (itemDto.unitCost < 0) {
        throw new Error(`El costo unitario para "${itemDto.productNameSnapshot}" no puede ser negativo.`);
      }

      const itemDiscount = itemDto.discountTotal || 0;
      const lineTotal = Math.max(
        0,
        Math.round((itemDto.orderedQuantity * itemDto.unitCost) / QUANTITY_SCALE) - itemDiscount
      );
      subtotal += lineTotal;

      return {
        id: generateUUID(),
        businessId,
        purchaseOrderId: orderId,
        productId: itemDto.productId,
        presentationId: itemDto.presentationId || null,
        productNameSnapshot: itemDto.productNameSnapshot,
        presentationNameSnapshot: itemDto.presentationNameSnapshot || null,
        baseUnit: itemDto.baseUnit,
        presentationFactor: itemDto.presentationFactor || 1,
        orderedQuantity: itemDto.orderedQuantity,
        unitCost: itemDto.unitCost,
        discountTotal: itemDiscount,
        lineTotal,
        skuSnapshot: itemDto.skuSnapshot || null,
        barcodeSnapshot: itemDto.barcodeSnapshot || null,
        createdAt: now,
        updatedAt: now,
      };
    });

    const total = Math.max(0, subtotal - discountTotal + taxTotal);

    const order: PurchaseOrder = {
      id: orderId,
      businessId,
      orderNumber: '', // Assigned inside repository transaction
      orderSequence: 0, // Assigned inside repository transaction
      supplierId: dto.supplierId,
      status,
      currencyCode: dto.currencyCode || 'CLP',
      subtotal,
      discountTotal,
      taxTotal,
      total,
      expectedDate: dto.expectedDate || null,
      note: dto.note || null,
      createdByUserId: userId,
      createdByNameSnapshot: userName,
      createdAt: now,
      updatedAt: now,
      orderedAt: status === 'ORDERED' ? now : null,
      completedAt: null,
      cancelledAt: null,
    };

    return this.purchaseOrderRepo.create(businessId, order, items);
  }
}
