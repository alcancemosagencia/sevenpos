import { PurchaseReceiptWithItems, ReceiveGoodsDto } from '../../domain/purchases/PurchaseReceipt';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';

export class ReceivePurchaseOrder {
  constructor(private purchaseOrderRepo: PurchaseOrderRepository) {}

  async execute(
    businessId: string,
    dto: ReceiveGoodsDto
  ): Promise<PurchaseReceiptWithItems> {
    if (!dto.purchaseOrderId) {
      throw new Error('El ID de la orden de compra es obligatorio.');
    }
    if (!dto.idempotencyKey || dto.idempotencyKey.trim().length === 0) {
      throw new Error('La clave de idempotencia (idempotencyKey) es obligatoria.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Debe especificar al menos un producto a recibir.');
    }

    const validItems = dto.items.filter((i) => i.receivedQuantity > 0);
    if (validItems.length === 0) {
      throw new Error('Debe ingresar una cantidad mayor a 0 para al menos un producto.');
    }

    for (const item of validItems) {
      if (item.unitCost < 0) {
        throw new Error('El costo unitario recibido no puede ser negativo.');
      }
    }

    return this.purchaseOrderRepo.receiveGoodsTransaction(businessId, {
      ...dto,
      items: validItems,
    });
  }
}
