import {
  PurchaseOrderItem,
  PurchaseOrderWithDetails,
  UpdatePurchaseOrderDraftDto,
} from '../../domain/purchases/PurchaseOrder';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { QUANTITY_SCALE } from '../../domain/common/quantity/Quantity';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

export class UpdatePurchaseOrderDraft {
  constructor(
    private purchaseOrderRepo: PurchaseOrderRepository,
    private supplierRepo: SupplierRepository
  ) {}

  async execute(
    businessId: string,
    orderId: string,
    dto: UpdatePurchaseOrderDraftDto
  ): Promise<PurchaseOrderWithDetails> {
    const existing = await this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
    if (!existing) {
      throw new Error('Orden de compra no encontrada.');
    }
    if (existing.status !== 'DRAFT') {
      throw new Error('Solo se pueden modificar órdenes de compra en estado Borrador (DRAFT).');
    }

    let supplierId = existing.supplierId;
    if (dto.supplierId && dto.supplierId !== existing.supplierId) {
      const supplier = await this.supplierRepo.findById(businessId, dto.supplierId);
      if (!supplier) {
        throw new Error('Proveedor no encontrado.');
      }
      if (!supplier.active) {
        throw new Error('El proveedor seleccionado se encuentra inactivo.');
      }
      supplierId = dto.supplierId;
    }

    const now = getCurrentTimestamp();
    let subtotal = existing.subtotal;
    let items: PurchaseOrderItem[] = existing.items;

    if (dto.items !== undefined) {
      if (dto.items.length === 0) {
        throw new Error('La orden de compra debe contener al menos un producto.');
      }

      subtotal = 0;
      items = dto.items.map((itemDto) => {
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
    }

    const discountTotal =
      dto.discountTotal !== undefined ? dto.discountTotal : existing.discountTotal;
    const taxTotal = dto.taxTotal !== undefined ? dto.taxTotal : existing.taxTotal;
    const total = Math.max(0, subtotal - discountTotal + taxTotal);

    const updatedOrder = {
      ...existing,
      supplierId,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      expectedDate: dto.expectedDate !== undefined ? dto.expectedDate : existing.expectedDate,
      note: dto.note !== undefined ? dto.note : existing.note,
      updatedAt: now,
    };

    return this.purchaseOrderRepo.updateDraft(businessId, updatedOrder, items);
  }
}
