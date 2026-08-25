import { PurchaseOrderWithDetails } from '../../domain/purchases/PurchaseOrder';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

export class SubmitPurchaseOrder {
  constructor(
    private purchaseOrderRepo: PurchaseOrderRepository,
    private supplierRepo: SupplierRepository
  ) {}

  async execute(businessId: string, orderId: string): Promise<PurchaseOrderWithDetails> {
    const existing = await this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
    if (!existing) {
      throw new Error('Orden de compra no encontrada.');
    }
    if (existing.status !== 'DRAFT') {
      throw new Error(`Solo se pueden enviar órdenes en estado Borrador (actual: ${existing.status}).`);
    }

    const supplier = await this.supplierRepo.findById(businessId, existing.supplierId);
    if (!supplier) {
      throw new Error('Proveedor no encontrado.');
    }
    if (!supplier.active) {
      throw new Error('El proveedor de esta orden se encuentra inactivo. Debe seleccionar un proveedor activo antes de enviar.');
    }

    const now = getCurrentTimestamp();
    await this.purchaseOrderRepo.updateStatus(businessId, orderId, 'ORDERED', now);

    const updated = await this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
    if (!updated) {
      throw new Error('Error al recuperar la orden actualizada.');
    }
    return updated;
  }
}

export class CancelPurchaseOrder {
  constructor(private purchaseOrderRepo: PurchaseOrderRepository) {}

  async execute(businessId: string, orderId: string): Promise<PurchaseOrderWithDetails> {
    const existing = await this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
    if (!existing) {
      throw new Error('Orden de compra no encontrada.');
    }
    if (existing.status === 'RECEIVED') {
      throw new Error('No se puede cancelar una orden de compra que ya ha sido completamente recibida.');
    }
    if (existing.status === 'CANCELLED') {
      throw new Error('La orden de compra ya se encuentra cancelada.');
    }

    // Check if any items have been received
    const hasReceipts = existing.items.some((item) => item.receivedQuantity > 0);
    if (hasReceipts) {
      throw new Error('No se puede cancelar una orden con recepciones físicas confirmadas.');
    }

    const now = getCurrentTimestamp();
    await this.purchaseOrderRepo.updateStatus(businessId, orderId, 'CANCELLED', now);

    const updated = await this.purchaseOrderRepo.findWithDetailsById(businessId, orderId);
    if (!updated) {
      throw new Error('Error al recuperar la orden actualizada.');
    }
    return updated;
  }
}
