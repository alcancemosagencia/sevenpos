import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderWithDetails,
  PurchaseOrderItemDetail,
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
import { DatabaseManager } from '../database/DatabaseManager';
import { QUANTITY_SCALE } from '../../domain/common/quantity/Quantity';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';
import { logger } from '../logging/Logger';

interface PurchaseOrderRow {
  id: string;
  business_id: string;
  order_number: string;
  order_sequence: number;
  supplier_id: string;
  status: string;
  currency_code: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  expected_date: string | null;
  note: string | null;
  created_by_user_id: string;
  created_by_name_snapshot: string;
  created_at: string;
  updated_at: string;
  ordered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface PurchaseOrderItemRow {
  id: string;
  business_id: string;
  purchase_order_id: string;
  product_id: string;
  presentation_id: string | null;
  product_name_snapshot: string;
  presentation_name_snapshot: string | null;
  base_unit: string;
  presentation_factor: number;
  ordered_quantity: number;
  unit_cost: number;
  discount_total: number;
  line_total: number;
  sku_snapshot: string | null;
  barcode_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseReceiptRow {
  id: string;
  business_id: string;
  purchase_order_id: string;
  receipt_number: string;
  receipt_sequence: number;
  received_by_user_id: string;
  received_by_name_snapshot: string;
  received_at: string;
  note: string | null;
  idempotency_key: string;
  created_at: string;
}

interface PurchaseReceiptItemRow {
  id: string;
  business_id: string;
  purchase_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string;
  presentation_id: string | null;
  received_quantity: number;
  base_quantity: number;
  unit_cost: number;
  line_cost_total: number;
  lot_id: string | null;
  lot_code_snapshot: string | null;
  expiration_date_snapshot: string | null;
  created_at: string;
}

export class SqlitePurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(
    private dbManager: DatabaseManager,
    private supplierRepo: SupplierRepository,
    private fallbackRepo: PurchaseOrderRepository
  ) {}

  private orderRowToEntity(r: PurchaseOrderRow): PurchaseOrder {
    return {
      id: r.id,
      businessId: r.business_id,
      orderNumber: r.order_number,
      orderSequence: r.order_sequence,
      supplierId: r.supplier_id,
      status: r.status as PurchaseOrderStatus,
      currencyCode: r.currency_code,
      subtotal: r.subtotal,
      discountTotal: r.discount_total,
      taxTotal: r.tax_total,
      total: r.total,
      expectedDate: r.expected_date,
      note: r.note,
      createdByUserId: r.created_by_user_id,
      createdByNameSnapshot: r.created_by_name_snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      orderedAt: r.ordered_at,
      completedAt: r.completed_at,
      cancelledAt: r.cancelled_at,
    };
  }

  private itemRowToEntity(r: PurchaseOrderItemRow): PurchaseOrderItem {
    return {
      id: r.id,
      businessId: r.business_id,
      purchaseOrderId: r.purchase_order_id,
      productId: r.product_id,
      presentationId: r.presentation_id,
      productNameSnapshot: r.product_name_snapshot,
      presentationNameSnapshot: r.presentation_name_snapshot,
      baseUnit: r.base_unit,
      presentationFactor: r.presentation_factor,
      orderedQuantity: r.ordered_quantity,
      unitCost: r.unit_cost,
      discountTotal: r.discount_total,
      lineTotal: r.line_total,
      skuSnapshot: r.sku_snapshot,
      barcodeSnapshot: r.barcode_snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private receiptRowToEntity(r: PurchaseReceiptRow): PurchaseReceipt {
    return {
      id: r.id,
      businessId: r.business_id,
      purchaseOrderId: r.purchase_order_id,
      receiptNumber: r.receipt_number,
      receiptSequence: r.receipt_sequence,
      receivedByUserId: r.received_by_user_id,
      receivedByNameSnapshot: r.received_by_name_snapshot,
      receivedAt: r.received_at,
      note: r.note,
      idempotencyKey: r.idempotency_key,
      createdAt: r.created_at,
    };
  }

  private receiptItemRowToEntity(r: PurchaseReceiptItemRow): PurchaseReceiptItem {
    return {
      id: r.id,
      businessId: r.business_id,
      purchaseReceiptId: r.purchase_receipt_id,
      purchaseOrderItemId: r.purchase_order_item_id,
      productId: r.product_id,
      presentationId: r.presentation_id,
      receivedQuantity: r.received_quantity,
      baseQuantity: r.base_quantity,
      unitCost: r.unit_cost,
      lineCostTotal: r.line_cost_total,
      lotId: r.lot_id,
      lotCodeSnapshot: r.lot_code_snapshot,
      expirationDateSnapshot: r.expiration_date_snapshot,
      createdAt: r.created_at,
    };
  }

  async findById(businessId: string, id: string): Promise<PurchaseOrder | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.findById(businessId, id);
    }
    const rows = await db.select<PurchaseOrderRow[]>(
      'SELECT * FROM purchase_orders WHERE business_id = ? AND id = ?',
      [businessId, id]
    );
    return rows.length > 0 ? this.orderRowToEntity(rows[0]) : null;
  }

  async findWithDetailsById(
    businessId: string,
    id: string
  ): Promise<PurchaseOrderWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.findWithDetailsById(businessId, id);
    }

    const order = await this.findById(businessId, id);
    if (!order) return null;

    const supplier = await this.supplierRepo.findById(businessId, order.supplierId);
    if (!supplier) {
      throw new Error('Proveedor asociado no encontrado.');
    }

    const itemRows = await db.select<PurchaseOrderItemRow[]>(
      'SELECT * FROM purchase_order_items WHERE business_id = ? AND purchase_order_id = ?',
      [businessId, id]
    );

    const receiptRows = await db.select<PurchaseReceiptRow[]>(
      'SELECT * FROM purchase_receipts WHERE business_id = ? AND purchase_order_id = ? ORDER BY receipt_sequence ASC',
      [businessId, id]
    );

    const receipts: PurchaseReceiptWithItems[] = [];
    for (const rr of receiptRows) {
      const rItemRows = await db.select<PurchaseReceiptItemRow[]>(
        'SELECT * FROM purchase_receipt_items WHERE business_id = ? AND purchase_receipt_id = ?',
        [businessId, rr.id]
      );
      receipts.push({
        ...this.receiptRowToEntity(rr),
        items: rItemRows.map((ri) => this.receiptItemRowToEntity(ri)),
      });
    }

    // Calculate received sums per item
    const itemDetails: PurchaseOrderItemDetail[] = [];
    for (const ir of itemRows) {
      const itemEntity = this.itemRowToEntity(ir);
      const receivedSumResult = await db.select<{ total_received: number }[]>(
        `SELECT COALESCE(SUM(received_quantity), 0) as total_received
         FROM purchase_receipt_items
         WHERE business_id = ? AND purchase_order_item_id = ?`,
        [businessId, ir.id]
      );
      const receivedQuantity = receivedSumResult[0]?.total_received || 0;
      const pendingQuantity = Math.max(0, ir.ordered_quantity - receivedQuantity);

      itemDetails.push({
        ...itemEntity,
        receivedQuantity,
        pendingQuantity,
      });
    }

    return {
      ...order,
      supplier,
      items: itemDetails,
      receipts,
    };
  }

  async list(
    businessId: string,
    options?: ListPurchaseOrdersOptions
  ): Promise<PurchaseOrder[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.list(businessId, options);
    }

    let sql = 'SELECT * FROM purchase_orders WHERE business_id = ?';
    const params: (string | number)[] = [businessId];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(options.supplierId);
    }
    if (options?.startDate) {
      sql += ' AND created_at >= ?';
      params.push(options.startDate);
    }
    if (options?.endDate) {
      sql += ' AND created_at <= ?';
      params.push(options.endDate);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await db.select<PurchaseOrderRow[]>(sql, params);
    return rows.map((r) => this.orderRowToEntity(r));
  }

  async create(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.create(businessId, order, items);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      // Next sequence
      const seqResult = await db.select<{ next_seq: number }[]>(
        'SELECT COALESCE(MAX(order_sequence), 0) + 1 as next_seq FROM purchase_orders WHERE business_id = ?',
        [businessId]
      );
      const nextSeq = seqResult[0]?.next_seq || 1;
      const orderNumber = `OC-${String(nextSeq).padStart(6, '0')}`;

      // Insert order
      await db.execute(
        `INSERT INTO purchase_orders (
          id, business_id, order_number, order_sequence, supplier_id, status, currency_code,
          subtotal, discount_total, tax_total, total, expected_date, note,
          created_by_user_id, created_by_name_snapshot, created_at, updated_at,
          ordered_at, completed_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          businessId,
          orderNumber,
          nextSeq,
          order.supplierId,
          order.status,
          order.currencyCode,
          order.subtotal,
          order.discountTotal,
          order.taxTotal,
          order.total,
          order.expectedDate || null,
          order.note || null,
          order.createdByUserId,
          order.createdByNameSnapshot,
          order.createdAt,
          order.updatedAt,
          order.orderedAt || null,
          order.completedAt || null,
          order.cancelledAt || null,
        ]
      );

      // Insert items
      for (const item of items) {
        await db.execute(
          `INSERT INTO purchase_order_items (
            id, business_id, purchase_order_id, product_id, presentation_id,
            product_name_snapshot, presentation_name_snapshot, base_unit, presentation_factor,
            ordered_quantity, unit_cost, discount_total, line_total,
            sku_snapshot, barcode_snapshot, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            businessId,
            order.id,
            item.productId,
            item.presentationId || null,
            item.productNameSnapshot,
            item.presentationNameSnapshot || null,
            item.baseUnit,
            item.presentationFactor,
            item.orderedQuantity,
            item.unitCost,
            item.discountTotal,
            item.lineTotal,
            item.skuSnapshot || null,
            item.barcodeSnapshot || null,
            item.createdAt,
            item.updatedAt,
          ]
        );
      }

      await db.execute('COMMIT');

      const created = await this.findWithDetailsById(businessId, order.id);
      if (!created) {
        throw new Error('Error al recuperar orden de compra creada.');
      }
      return created;
    } catch (err) {
      await db.execute('ROLLBACK').catch(() => {});
      logger.error('SqlitePurchaseOrderRepository', 'Failed to create purchase order', {
        error: String(err),
      });
      throw err;
    }
  }

  async updateDraft(
    businessId: string,
    order: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<PurchaseOrderWithDetails> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.updateDraft(businessId, order, items);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      await db.execute(
        `UPDATE purchase_orders SET
          supplier_id = ?, subtotal = ?, discount_total = ?, tax_total = ?, total = ?,
          expected_date = ?, note = ?, updated_at = ?
        WHERE business_id = ? AND id = ? AND status = 'DRAFT'`,
        [
          order.supplierId,
          order.subtotal,
          order.discountTotal,
          order.taxTotal,
          order.total,
          order.expectedDate || null,
          order.note || null,
          order.updatedAt,
          businessId,
          order.id,
        ]
      );

      // Replace items
      await db.execute(
        'DELETE FROM purchase_order_items WHERE business_id = ? AND purchase_order_id = ?',
        [businessId, order.id]
      );

      for (const item of items) {
        await db.execute(
          `INSERT INTO purchase_order_items (
            id, business_id, purchase_order_id, product_id, presentation_id,
            product_name_snapshot, presentation_name_snapshot, base_unit, presentation_factor,
            ordered_quantity, unit_cost, discount_total, line_total,
            sku_snapshot, barcode_snapshot, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            businessId,
            order.id,
            item.productId,
            item.presentationId || null,
            item.productNameSnapshot,
            item.presentationNameSnapshot || null,
            item.baseUnit,
            item.presentationFactor,
            item.orderedQuantity,
            item.unitCost,
            item.discountTotal,
            item.lineTotal,
            item.skuSnapshot || null,
            item.barcodeSnapshot || null,
            item.createdAt,
            item.updatedAt,
          ]
        );
      }

      await db.execute('COMMIT');

      const updated = await this.findWithDetailsById(businessId, order.id);
      if (!updated) {
        throw new Error('Error al recuperar orden de compra actualizada.');
      }
      return updated;
    } catch (err) {
      await db.execute('ROLLBACK').catch(() => {});
      throw err;
    }
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: PurchaseOrderStatus,
    timestamp?: string
  ): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.updateStatus(businessId, id, status, timestamp);
    }
    const now = timestamp || getCurrentTimestamp();
    await db.execute(
      `UPDATE purchase_orders SET
        status = ?,
        updated_at = ?,
        ordered_at = CASE WHEN ? = 'ORDERED' AND ordered_at IS NULL THEN ? ELSE ordered_at END,
        completed_at = CASE WHEN ? = 'RECEIVED' THEN ? ELSE completed_at END,
        cancelled_at = CASE WHEN ? = 'CANCELLED' THEN ? ELSE cancelled_at END
      WHERE business_id = ? AND id = ?`,
      [status, now, status, now, status, now, status, now, businessId, id]
    );
  }

  async receiveGoodsTransaction(
    businessId: string,
    dto: ReceiveGoodsDto
  ): Promise<PurchaseReceiptWithItems> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.receiveGoodsTransaction(businessId, dto);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      // 1. Idempotency check
      const existingRows = await db.select<PurchaseReceiptRow[]>(
        'SELECT * FROM purchase_receipts WHERE business_id = ? AND idempotency_key = ?',
        [businessId, dto.idempotencyKey]
      );
      if (existingRows.length > 0) {
        const existingReceipt = this.receiptRowToEntity(existingRows[0]);
        const itemRows = await db.select<PurchaseReceiptItemRow[]>(
          'SELECT * FROM purchase_receipt_items WHERE business_id = ? AND purchase_receipt_id = ?',
          [businessId, existingReceipt.id]
        );
        await db.execute('COMMIT');
        return {
          ...existingReceipt,
          items: itemRows.map((ri) => this.receiptItemRowToEntity(ri)),
        };
      }

      // 2. Validate PO exists and is receivable
      const poRows = await db.select<PurchaseOrderRow[]>(
        'SELECT * FROM purchase_orders WHERE business_id = ? AND id = ?',
        [businessId, dto.purchaseOrderId]
      );
      if (poRows.length === 0) {
        throw new Error('Orden de compra no encontrada.');
      }
      const order = this.orderRowToEntity(poRows[0]);
      if (order.status !== 'ORDERED' && order.status !== 'PARTIALLY_RECEIVED') {
        throw new Error(
          `No se puede recibir mercadería de una orden en estado "${order.status}". Debe estar en estado ENVIADA (ORDERED) o PARCIALMENTE RECIBIDA.`
        );
      }

      // 3. Next Receipt Sequence
      const seqResult = await db.select<{ next_seq: number }[]>(
        'SELECT COALESCE(MAX(receipt_sequence), 0) + 1 as next_seq FROM purchase_receipts WHERE business_id = ?',
        [businessId]
      );
      const receiptSequence = seqResult[0]?.next_seq || 1;
      const receiptNumber = `REC-${String(receiptSequence).padStart(6, '0')}`;
      const receiptId = generateUUID();
      const now = dto.receivedAt || getCurrentTimestamp();

      // Insert Purchase Receipt Header
      await db.execute(
        `INSERT INTO purchase_receipts (
          id, business_id, purchase_order_id, receipt_number, receipt_sequence,
          received_by_user_id, received_by_name_snapshot, received_at, note,
          idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          businessId,
          order.id,
          receiptNumber,
          receiptSequence,
          dto.receivedByUserId,
          dto.receivedByNameSnapshot,
          now,
          dto.note || null,
          dto.idempotencyKey,
          now,
        ]
      );

      const newReceiptItems: PurchaseReceiptItem[] = [];

      // Fetch all PO items for validation
      const poItemRows = await db.select<PurchaseOrderItemRow[]>(
        'SELECT * FROM purchase_order_items WHERE business_id = ? AND purchase_order_id = ?',
        [businessId, order.id]
      );

      // 4. Process Each Item
      for (const itemDto of dto.items) {
        if (itemDto.receivedQuantity <= 0) continue;

        const poItem = poItemRows.find((it) => it.id === itemDto.purchaseOrderItemId);
        if (!poItem) {
          throw new Error(`Línea de orden de compra no encontrada: ${itemDto.purchaseOrderItemId}`);
        }

        // Calculate previously received for this line
        const prevReceivedResult = await db.select<{ total_received: number }[]>(
          `SELECT COALESCE(SUM(received_quantity), 0) as total_received
           FROM purchase_receipt_items
           WHERE business_id = ? AND purchase_order_item_id = ?`,
          [businessId, poItem.id]
        );
        const previouslyReceived = prevReceivedResult[0]?.total_received || 0;
        const pendingQuantity = Math.max(0, poItem.ordered_quantity - previouslyReceived);

        if (itemDto.receivedQuantity > pendingQuantity) {
          throw new Error(
            `RECEIPT_QUANTITY_EXCEEDS_PENDING: La cantidad a recibir (${itemDto.receivedQuantity / QUANTITY_SCALE}) supera la cantidad pendiente (${pendingQuantity / QUANTITY_SCALE}) para el producto "${poItem.product_name_snapshot}".`
          );
        }

        const factor = poItem.presentation_factor || 1;
        const baseQuantity = itemDto.receivedQuantity * factor;
        if (!Number.isSafeInteger(baseQuantity)) {
          throw new Error('Error de desbordamiento en cálculo de cantidad base.');
        }

        const lineCostTotal = Math.round(
          (itemDto.receivedQuantity * itemDto.unitCost) / QUANTITY_SCALE
        );

        // Resolve Lot
        let resolvedLotId: string | null = null;
        let lotCodeSnapshot: string | null = null;
        let expirationDateSnapshot: string | null = null;

        if (itemDto.lotCode && itemDto.lotCode.trim().length > 0) {
          const cleanCode = itemDto.lotCode.trim();
          lotCodeSnapshot = cleanCode;
          expirationDateSnapshot = itemDto.expirationDate || null;

          const existingLots = await db.select<{ id: string; expiration_date: string | null }[]>(
            'SELECT id, expiration_date FROM inventory_lots WHERE business_id = ? AND product_id = ? AND lot_code = ?',
            [businessId, poItem.product_id, cleanCode]
          );

          if (existingLots.length > 0) {
            const existingLot = existingLots[0];
            if (
              existingLot.expiration_date &&
              itemDto.expirationDate &&
              existingLot.expiration_date !== itemDto.expirationDate
            ) {
              throw new Error(
                `LOT_CONFLICT: El lote "${cleanCode}" ya existe con una fecha de vencimiento diferente (${existingLot.expiration_date} vs ${itemDto.expirationDate}).`
              );
            }
            resolvedLotId = existingLot.id;
          } else {
            resolvedLotId = generateUUID();
            await db.execute(
              `INSERT INTO inventory_lots (
                id, business_id, product_id, lot_code, expiration_date, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                resolvedLotId,
                businessId,
                poItem.product_id,
                cleanCode,
                itemDto.expirationDate || null,
                now,
                now,
              ]
            );
          }
        }

        const receiptItemId = generateUUID();
        await db.execute(
          `INSERT INTO purchase_receipt_items (
            id, business_id, purchase_receipt_id, purchase_order_item_id, product_id,
            presentation_id, received_quantity, base_quantity, unit_cost, line_cost_total,
            lot_id, lot_code_snapshot, expiration_date_snapshot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptItemId,
            businessId,
            receiptId,
            poItem.id,
            poItem.product_id,
            poItem.presentation_id || null,
            itemDto.receivedQuantity,
            baseQuantity,
            itemDto.unitCost,
            lineCostTotal,
            resolvedLotId,
            lotCodeSnapshot,
            expirationDateSnapshot,
            now,
          ]
        );

        newReceiptItems.push({
          id: receiptItemId,
          businessId,
          purchaseReceiptId: receiptId,
          purchaseOrderItemId: poItem.id,
          productId: poItem.product_id,
          presentationId: poItem.presentation_id || null,
          receivedQuantity: itemDto.receivedQuantity,
          baseQuantity,
          unitCost: itemDto.unitCost,
          lineCostTotal,
          lotId: resolvedLotId,
          lotCodeSnapshot,
          expirationDateSnapshot,
          createdAt: now,
        });

        // Insert Inventory Movement ENTRY
        const baseUnitCost = Math.round(itemDto.unitCost / factor);
        await db.execute(
          `INSERT INTO inventory_movements (
            id, business_id, product_id, lot_id, movement_type, quantity_delta,
            unit_cost, total_cost, reason_code, note, reference_type, reference_id,
            created_by_user_id, occurred_at, created_at
          ) VALUES (?, ?, ?, ?, 'ENTRY', ?, ?, ?, NULL, ?, 'PURCHASE_RECEIPT', ?, ?, ?, ?)`,
          [
            generateUUID(),
            businessId,
            poItem.product_id,
            resolvedLotId,
            baseQuantity,
            baseUnitCost,
            lineCostTotal,
            `Recepción de compra ${receiptNumber} (Orden ${order.orderNumber})`,
            receiptId,
            dto.receivedByUserId,
            now,
            now,
          ]
        );
      }

      // 5. Derive New Order Status
      let allReceived = true;
      let anyReceived = false;

      for (const poItem of poItemRows) {
        const totalReceivedResult = await db.select<{ total_received: number }[]>(
          `SELECT COALESCE(SUM(received_quantity), 0) as total_received
           FROM purchase_receipt_items
           WHERE business_id = ? AND purchase_order_item_id = ?`,
          [businessId, poItem.id]
        );
        const totalReceived = totalReceivedResult[0]?.total_received || 0;
        if (totalReceived > 0) anyReceived = true;
        if (totalReceived < poItem.ordered_quantity) {
          allReceived = false;
        }
      }

      const nextStatus: PurchaseOrderStatus = allReceived
        ? 'RECEIVED'
        : anyReceived
        ? 'PARTIALLY_RECEIVED'
        : order.status;

      await db.execute(
        `UPDATE purchase_orders SET
          status = ?,
          updated_at = ?,
          completed_at = CASE WHEN ? = 'RECEIVED' THEN ? ELSE completed_at END
        WHERE business_id = ? AND id = ?`,
        [nextStatus, now, nextStatus, now, businessId, order.id]
      );

      await db.execute('COMMIT');

      return {
        id: receiptId,
        businessId,
        purchaseOrderId: order.id,
        receiptNumber,
        receiptSequence,
        receivedByUserId: dto.receivedByUserId,
        receivedByNameSnapshot: dto.receivedByNameSnapshot,
        receivedAt: now,
        note: dto.note || null,
        idempotencyKey: dto.idempotencyKey,
        createdAt: now,
        items: newReceiptItems,
      };
    } catch (err) {
      await db.execute('ROLLBACK').catch(() => {});
      logger.error('SqlitePurchaseOrderRepository', 'Failed to receive goods in transaction', {
        error: String(err),
      });
      throw err;
    }
  }

  async getReceiptById(
    businessId: string,
    receiptId: string
  ): Promise<PurchaseReceiptWithItems | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getReceiptById(businessId, receiptId);
    }
    const rows = await db.select<PurchaseReceiptRow[]>(
      'SELECT * FROM purchase_receipts WHERE business_id = ? AND id = ?',
      [businessId, receiptId]
    );
    if (rows.length === 0) return null;

    const receipt = this.receiptRowToEntity(rows[0]);
    const itemRows = await db.select<PurchaseReceiptItemRow[]>(
      'SELECT * FROM purchase_receipt_items WHERE business_id = ? AND purchase_receipt_id = ?',
      [businessId, receipt.id]
    );

    return {
      ...receipt,
      items: itemRows.map((ri) => this.receiptItemRowToEntity(ri)),
    };
  }

  async listReceiptsByOrder(
    businessId: string,
    purchaseOrderId: string
  ): Promise<PurchaseReceiptWithItems[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.listReceiptsByOrder(businessId, purchaseOrderId);
    }
    const rows = await db.select<PurchaseReceiptRow[]>(
      'SELECT * FROM purchase_receipts WHERE business_id = ? AND purchase_order_id = ? ORDER BY receipt_sequence ASC',
      [businessId, purchaseOrderId]
    );

    const receipts: PurchaseReceiptWithItems[] = [];
    for (const r of rows) {
      const itemRows = await db.select<PurchaseReceiptItemRow[]>(
        'SELECT * FROM purchase_receipt_items WHERE business_id = ? AND purchase_receipt_id = ?',
        [businessId, r.id]
      );
      receipts.push({
        ...this.receiptRowToEntity(r),
        items: itemRows.map((ri) => this.receiptItemRowToEntity(ri)),
      });
    }
    return receipts;
  }
}
