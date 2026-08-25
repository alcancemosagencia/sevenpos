import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderWithDetails,
} from '../../domain/purchases/PurchaseOrder';
import {
  PurchaseReceipt,
  PurchaseReceiptItem,
  PurchaseReceiptWithItems,
  ReceiveGoodsDto,
} from '../../domain/purchases/PurchaseReceipt';
import {
  PurchaseOrderRepository,
  ListPurchaseOrdersOptions,
} from '../../domain/purchases/repositories/PurchaseOrderRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { QUANTITY_SCALE } from '../../domain/common/quantity/Quantity';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

const ORDERS_KEY = 'sevenpos-dev-purchase-orders';
const ITEMS_KEY = 'sevenpos-dev-purchase-order-items';
const RECEIPTS_KEY = 'sevenpos-dev-purchase-receipts';
const RECEIPT_ITEMS_KEY = 'sevenpos-dev-purchase-receipt-items';

export class InMemoryPurchaseOrderRepository implements PurchaseOrderRepository {
  private orders: PurchaseOrder[] = [];
  private orderItems: PurchaseOrderItem[] = [];
  private receipts: PurchaseReceipt[] = [];
  private receiptItems: PurchaseReceiptItem[] = [];

  constructor(
    private supplierRepo: SupplierRepository,
    private inventoryMovementRepo?: InventoryMovementRepository,
    private inventoryLotRepo?: InventoryLotRepository
  ) {
    this.loadFromDevStorage();
  }

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadFromDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const rawO = window.localStorage.getItem(ORDERS_KEY);
        if (rawO) this.orders = JSON.parse(rawO);

        const rawI = window.localStorage.getItem(ITEMS_KEY);
        if (rawI) this.orderItems = JSON.parse(rawI);

        const rawR = window.localStorage.getItem(RECEIPTS_KEY);
        if (rawR) this.receipts = JSON.parse(rawR);

        const rawRI = window.localStorage.getItem(RECEIPT_ITEMS_KEY);
        if (rawRI) this.receiptItems = JSON.parse(rawRI);
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(ORDERS_KEY, JSON.stringify(this.orders));
        window.localStorage.setItem(ITEMS_KEY, JSON.stringify(this.orderItems));
        window.localStorage.setItem(RECEIPTS_KEY, JSON.stringify(this.receipts));
        window.localStorage.setItem(RECEIPT_ITEMS_KEY, JSON.stringify(this.receiptItems));
      } catch {
        // Dev fallback
      }
    }
  }

  async findById(businessId: string, id: string): Promise<PurchaseOrder | null> {
    this.loadFromDevStorage();
    const o = this.orders.find((ord) => ord.businessId === businessId && ord.id === id);
    return o ? { ...o } : null;
  }

  async findByOrderNumber(businessId: string, orderNumber: string): Promise<PurchaseOrder | null> {
    this.loadFromDevStorage();
    const o = this.orders.find(
      (ord) => ord.businessId === businessId && ord.orderNumber === orderNumber
    );
    return o ? { ...o } : null;
  }

  async getNextOrderSequence(businessId: string): Promise<number> {
    this.loadFromDevStorage();
    const bOrders = this.orders.filter((ord) => ord.businessId === businessId);
    if (bOrders.length === 0) return 1;
    return Math.max(...bOrders.map((o) => o.orderSequence)) + 1;
  }

  async getNextReceiptSequence(businessId: string): Promise<number> {
    this.loadFromDevStorage();
    const bReceipts = this.receipts.filter((r) => r.businessId === businessId);
    if (bReceipts.length === 0) return 1;
    return Math.max(...bReceipts.map((r) => r.receiptSequence)) + 1;
  }

  async getWithDetails(
    businessId: string,
    id: string
  ): Promise<PurchaseOrderWithDetails | null> {
    this.loadFromDevStorage();
    const order = await this.findById(businessId, id);
    if (!order) return null;

    const supplier = await this.supplierRepo.findById(businessId, order.supplierId);
    if (!supplier) {
      throw new Error(`Proveedor ${order.supplierId} no encontrado para la orden ${order.id}`);
    }

    const items = this.orderItems.filter((i) => i.purchaseOrderId === order.id);
    const orderReceipts = this.receipts.filter((r) => r.purchaseOrderId === order.id);

    const itemsWithDetails = items.map((item) => {
      const itemReceiptLines = this.receiptItems.filter((ri) => ri.purchaseOrderItemId === item.id);
      const receivedQuantity = itemReceiptLines.reduce((sum, ri) => sum + ri.receivedQuantity, 0);
      const pendingQuantity = Math.max(0, item.orderedQuantity - receivedQuantity);

      return {
        ...item,
        receivedQuantity,
        pendingQuantity,
      };
    });

    const receiptsWithItems: PurchaseReceiptWithItems[] = orderReceipts.map((r) => ({
      ...r,
      items: this.receiptItems.filter((ri) => ri.purchaseReceiptId === r.id),
    }));

    return {
      ...order,
      supplier,
      items: itemsWithDetails,
      receipts: receiptsWithItems,
    };
  }

  async findWithDetailsById(
    businessId: string,
    id: string
  ): Promise<PurchaseOrderWithDetails | null> {
    return this.getWithDetails(businessId, id);
  }

  async listReceiptsByOrder(
    businessId: string,
    purchaseOrderId: string
  ): Promise<PurchaseReceiptWithItems[]> {
    this.loadFromDevStorage();
    const orderReceipts = this.receipts.filter(
      (r) => r.businessId === businessId && r.purchaseOrderId === purchaseOrderId
    );
    return orderReceipts.map((r) => ({
      ...r,
      items: this.receiptItems.filter((ri) => ri.purchaseReceiptId === r.id),
    }));
  }

  async getReceiptById(
    businessId: string,
    receiptId: string
  ): Promise<PurchaseReceiptWithItems | null> {
    this.loadFromDevStorage();
    const r = this.receipts.find((rec) => rec.businessId === businessId && rec.id === receiptId);
    if (!r) return null;
    return {
      ...r,
      items: this.receiptItems.filter((ri) => ri.purchaseReceiptId === r.id),
    };
  }

  async list(
    businessId: string,
    options?: ListPurchaseOrdersOptions
  ): Promise<PurchaseOrder[]> {
    this.loadFromDevStorage();
    let result = this.orders.filter((o) => o.businessId === businessId);

    if (options?.supplierId) {
      result = result.filter((o) => o.supplierId === options.supplierId);
    }
    const searchVal = (options as { search?: string })?.search;
    if (searchVal) {
      const q = searchVal.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.note && o.note.toLowerCase().includes(q))
      );
    }

    return result
      .map((o) => ({ ...o }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails> {
    this.loadFromDevStorage();
    const seq = await this.getNextOrderSequence(businessId);
    order.orderSequence = seq;
    order.orderNumber = `OC-${String(seq).padStart(6, '0')}`;

    this.orders.push({ ...order });
    this.orderItems.push(...items);
    this.saveToDevStorage();

    const created = await this.findWithDetailsById(businessId, order.id);
    if (!created) {
      throw new Error(`Error al recuperar orden recién creada ${order.id}`);
    }
    return created;
  }

  async updateDraft(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails> {
    this.loadFromDevStorage();
    const existingIndex = this.orders.findIndex(
      (o) => o.businessId === order.businessId && o.id === order.id
    );

    if (existingIndex !== -1) {
      this.orders[existingIndex] = { ...order };
      this.orderItems = this.orderItems.filter((i) => i.purchaseOrderId !== order.id);
      this.orderItems.push(...items);
    } else {
      this.orders.push({ ...order });
      this.orderItems.push(...items);
    }
    this.saveToDevStorage();

    const updated = await this.findWithDetailsById(businessId, order.id);
    if (!updated) {
      throw new Error(`Error al recuperar orden actualizada ${order.id}`);
    }
    return updated;
  }

  async save(
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<void> {
    await this.updateDraft(order.businessId, order, items);
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: PurchaseOrderStatus,
    timestamp?: string
  ): Promise<void> {
    this.loadFromDevStorage();
    const order = this.orders.find((o) => o.businessId === businessId && o.id === id);
    if (!order) {
      throw new Error(`Orden ${id} no encontrada.`);
    }

    const now = timestamp || getCurrentTimestamp();
    order.status = status;
    order.updatedAt = now;
    if (status === 'ORDERED') order.orderedAt = now;
    if (status === 'RECEIVED') order.completedAt = now;
    if (status === 'CANCELLED') order.cancelledAt = now;
    this.saveToDevStorage();
  }

  async receiveGoodsTransaction(
    businessId: string,
    dto: ReceiveGoodsDto
  ): Promise<PurchaseReceiptWithItems> {
    this.loadFromDevStorage();

    // 1. Check idempotency FIRST
    const existingReceipt = this.receipts.find(
      (r) => r.businessId === businessId && r.idempotencyKey === dto.idempotencyKey
    );
    if (existingReceipt) {
      const items = this.receiptItems.filter((ri) => ri.purchaseReceiptId === existingReceipt.id);
      return { ...existingReceipt, items };
    }

    const order = await this.findById(businessId, dto.purchaseOrderId);
    if (!order) {
      throw new Error(`Orden ${dto.purchaseOrderId} no encontrada.`);
    }
    if (order.status !== 'ORDERED' && order.status !== 'PARTIALLY_RECEIVED') {
      throw new Error(`No se puede recibir una orden en estado ${order.status}.`);
    }

    const orderItems = this.orderItems.filter((i) => i.purchaseOrderId === order.id);
    const existingReceiptItems = this.receiptItems.filter((ri) =>
      orderItems.some((oi) => oi.id === ri.purchaseOrderItemId)
    );

    const now = getCurrentTimestamp();
    const receiptSeq = await this.getNextReceiptSequence(businessId);
    const receiptNumber = `REC-${String(receiptSeq).padStart(6, '0')}`;

    const newReceiptItems: PurchaseReceiptItem[] = [];

    for (const itemDto of dto.items) {
      const orderItem = orderItems.find((oi) => oi.id === itemDto.purchaseOrderItemId);
      if (!orderItem) {
        throw new Error(`Línea de orden ${itemDto.purchaseOrderItemId} no pertenece a la orden.`);
      }

      if (itemDto.receivedQuantity <= 0) {
        continue;
      }

      const receivedPreviously = existingReceiptItems
        .filter((ri) => ri.purchaseOrderItemId === orderItem.id)
        .reduce((sum, ri) => sum + ri.receivedQuantity, 0);

      const pending = orderItem.orderedQuantity - receivedPreviously;
      if (itemDto.receivedQuantity > pending) {
        throw new Error(
          `RECEIPT_QUANTITY_EXCEEDS_PENDING: La cantidad a recibir (${itemDto.receivedQuantity / QUANTITY_SCALE}) supera la cantidad pendiente (${pending / QUANTITY_SCALE}) para el producto "${orderItem.productNameSnapshot}".`
        );
      }

      const presentationFactor = orderItem.presentationFactor || 1;
      const baseQuantityScaled = itemDto.receivedQuantity * presentationFactor;
      if (!Number.isSafeInteger(baseQuantityScaled)) {
        throw new Error(`Overflow o integer no seguro calculando baseQuantityScaled.`);
      }

      const lineCostTotal = Math.round(
        (itemDto.receivedQuantity * itemDto.unitCost) / QUANTITY_SCALE
      );

      let lotId: string | null = null;
      if (itemDto.lotCode && this.inventoryLotRepo) {
        const lotCodeNormalized = itemDto.lotCode.trim().toUpperCase();
        const existingLot = await this.inventoryLotRepo.findByCode(
          orderItem.productId,
          lotCodeNormalized,
          businessId
        );

        if (existingLot) {
          if (
            existingLot.expirationDate &&
            itemDto.expirationDate &&
            existingLot.expirationDate !== itemDto.expirationDate
          ) {
            throw new Error(
              `LOT_CONFLICT: El lote "${lotCodeNormalized}" ya existe con fecha de expiración ${existingLot.expirationDate}, no coincide con ${itemDto.expirationDate}.`
            );
          }
          lotId = existingLot.id;
        } else {
          const newLot = await this.inventoryLotRepo.createLot({
            businessId,
            productId: orderItem.productId,
            lotCode: lotCodeNormalized,
            expirationDate: itemDto.expirationDate || null,
          });
          lotId = newLot.id;
        }
      }

      const receiptItemId = generateUUID();
      const receiptItem: PurchaseReceiptItem = {
        id: receiptItemId,
        businessId,
        purchaseReceiptId: '', // Filled below
        purchaseOrderItemId: orderItem.id,
        productId: orderItem.productId,
        presentationId: orderItem.presentationId,
        receivedQuantity: itemDto.receivedQuantity,
        baseQuantity: baseQuantityScaled,
        unitCost: itemDto.unitCost,
        lineCostTotal,
        lotId,
        lotCodeSnapshot: itemDto.lotCode ? itemDto.lotCode.trim().toUpperCase() : null,
        expirationDateSnapshot: itemDto.expirationDate || null,
        createdAt: now,
      };

      newReceiptItems.push(receiptItem);

      if (this.inventoryMovementRepo) {
        await this.inventoryMovementRepo.recordMovement({
          businessId,
          productId: orderItem.productId,
          movementType: 'ENTRY',
          quantityDelta: baseQuantityScaled,
          unitCost: Math.round(lineCostTotal / (baseQuantityScaled / QUANTITY_SCALE)),
          totalCost: lineCostTotal,
          lotId: lotId || undefined,
          referenceType: 'PURCHASE_RECEIPT',
          referenceId: receiptNumber,
          note: `Recepción ${receiptNumber} orden ${order.orderNumber}`,
          occurredAt: now,
          createdByUserId: dto.receivedByUserId,
        });
      }
    }

    if (newReceiptItems.length === 0) {
      throw new Error('No se especificaron líneas válidas para recibir.');
    }

    const receiptId = generateUUID();
    const newReceipt: PurchaseReceipt = {
      id: receiptId,
      businessId,
      purchaseOrderId: order.id,
      receiptNumber,
      receiptSequence: receiptSeq,
      receivedAt: now,
      receivedByUserId: dto.receivedByUserId,
      receivedByNameSnapshot: dto.receivedByNameSnapshot,
      note: dto.note || null,
      idempotencyKey: dto.idempotencyKey,
      createdAt: now,
    };

    for (const ri of newReceiptItems) {
      ri.purchaseReceiptId = receiptId;
    }

    this.receipts.push(newReceipt);
    this.receiptItems.push(...newReceiptItems);

    let allComplete = true;
    let anyReceived = false;

    for (const oi of orderItems) {
      const totalRec = [
        ...existingReceiptItems.filter((ri) => ri.purchaseOrderItemId === oi.id),
        ...newReceiptItems.filter((ri) => ri.purchaseOrderItemId === oi.id),
      ].reduce((sum, ri) => sum + ri.receivedQuantity, 0);

      if (totalRec > 0) anyReceived = true;
      if (totalRec < oi.orderedQuantity) allComplete = false;
    }

    const newStatus: PurchaseOrderStatus = allComplete
      ? 'RECEIVED'
      : anyReceived
      ? 'PARTIALLY_RECEIVED'
      : 'ORDERED';

    await this.updateStatus(
      businessId,
      order.id,
      newStatus,
      allComplete ? now : undefined
    );

    this.saveToDevStorage();

    return {
      ...newReceipt,
      items: newReceiptItems,
    };
  }
}
