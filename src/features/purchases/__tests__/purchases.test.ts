import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySupplierRepository } from '../../../infrastructure/repositories/InMemorySupplierRepository';
import { InMemoryPurchaseOrderRepository } from '../../../infrastructure/repositories/InMemoryPurchaseOrderRepository';
import { InMemoryInventoryMovementRepository } from '../../../infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { CreateSupplier } from '../../../application/purchases/CreateSupplier';
import { UpdateSupplier } from '../../../application/purchases/UpdateSupplier';
import { DeactivateSupplier, ActivateSupplier } from '../../../application/purchases/DeactivateSupplier';
import { ListSuppliers } from '../../../application/purchases/ListSuppliers';
import { CreatePurchaseOrder } from '../../../application/purchases/CreatePurchaseOrder';
import { SubmitPurchaseOrder } from '../../../application/purchases/SubmitPurchaseOrder';
import { ReceivePurchaseOrder } from '../../../application/purchases/ReceivePurchaseOrder';
import { QUANTITY_SCALE } from '../../../domain/common/quantity/Quantity';
import { calculateSequentialWAC } from '../../../domain/inventory/InventoryCost';

describe('AG-08 Purchases Domain & Use Cases', () => {
  const businessId = 'test-business-1';

  let supplierRepo: InMemorySupplierRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let productRepo: InMemoryProductRepository;
  let orderRepo: InMemoryPurchaseOrderRepository;

  beforeEach(async () => {
    supplierRepo = new InMemorySupplierRepository();
    movementRepo = new InMemoryInventoryMovementRepository();
    lotRepo = new InMemoryInventoryLotRepository(movementRepo);
    productRepo = new InMemoryProductRepository();
    orderRepo = new InMemoryPurchaseOrderRepository(supplierRepo, movementRepo, lotRepo);

    // Seed test products
    await productRepo.save({
      id: 'prod-coca',
      businessId,
      name: 'Coca Cola 1.5L',
      baseUnit: 'UNIT',
      salePrice: 2500,
      costPrice: 1000,
      sku: 'BEB-001',
      featured: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await productRepo.save({
      id: 'prod-arroz',
      businessId,
      name: 'Arroz Grano Largo',
      baseUnit: 'KG',
      salePrice: 1800,
      costPrice: 900,
      sku: 'ARR-001',
      featured: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('1. Supplier Management', () => {
    it('creates, updates, deactivates and activates a supplier', async () => {
      const createUseCase = new CreateSupplier(supplierRepo);
      const updateUseCase = new UpdateSupplier(supplierRepo);
      const deactivateUseCase = new DeactivateSupplier(supplierRepo);
      const activateUseCase = new ActivateSupplier(supplierRepo);
      const listUseCase = new ListSuppliers(supplierRepo);

      // Create
      const supplier = await createUseCase.execute(businessId, {
        name: 'Distribuidora Central',
        taxId: '76.543.210-K',
        contactName: 'Juan Pérez',
        phone: '+56912345678',
        email: 'contacto@central.cl',
      });
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Distribuidora Central');
      expect(supplier.active).toBe(true);

      // Duplicate name check
      await expect(
        createUseCase.execute(businessId, { name: 'distribuidora central' })
      ).rejects.toThrow('Ya existe un proveedor');

      // Update
      const updated = await updateUseCase.execute(businessId, supplier.id, {
        contactName: 'Juan Carlos Pérez',
        phone: '+56999999999',
      });
      expect(updated.contactName).toBe('Juan Carlos Pérez');
      expect(updated.phone).toBe('+56999999999');

      // Deactivate
      await deactivateUseCase.execute(businessId, supplier.id);
      const activeList = await listUseCase.execute(businessId, false);
      expect(activeList.length).toBe(0);

      const allList = await listUseCase.execute(businessId, true);
      expect(allList.length).toBe(1);
      expect(allList[0].active).toBe(false);

      // Activate
      await activateUseCase.execute(businessId, supplier.id);
      const reactivatedList = await listUseCase.execute(businessId, false);
      expect(reactivatedList.length).toBe(1);
      expect(reactivatedList[0].active).toBe(true);
    });
  });

  describe('2. Purchase Order Lifecycle & Invariants', () => {
    it('creates DRAFT and SUBMITS order without altering inventory', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor A',
      });

      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const createOrderUseCase = new CreatePurchaseOrder(orderRepo, supplierRepo);
      const order = await createOrderUseCase.execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'DRAFT',
        },
        'user-1',
        'Dueño'
      );

      expect(order.status).toBe('DRAFT');
      expect(order.orderNumber).toBe('OC-000001');
      expect(order.total).toBe(10000);

      // Inventory check: zero movements
      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements.length).toBe(0);

      // Submit Order (DRAFT -> ORDERED)
      const submitUseCase = new SubmitPurchaseOrder(orderRepo, supplierRepo);
      const submitted = await submitUseCase.execute(businessId, order.id);
      expect(submitted.status).toBe('ORDERED');
      expect(submitted.orderedAt).toBeDefined();

      // Inventory check: still zero movements
      const movementsAfterSubmit = await movementRepo.listByProduct(businessId, prod.id);
      expect(movementsAfterSubmit.length).toBe(0);
    });

    it('blocks submitting order if supplier was deactivated', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Inactivo Test',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 5 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'DRAFT',
        },
        'user-1',
        'Dueño'
      );

      // Deactivate supplier
      await new DeactivateSupplier(supplierRepo).execute(businessId, supplier.id);

      // Attempt submit
      await expect(
        new SubmitPurchaseOrder(orderRepo, supplierRepo).execute(businessId, order.id)
      ).rejects.toThrow('proveedor de esta orden se encuentra inactivo');
    });
  });

  describe('3. Goods Reception & Partial Receipts', () => {
    it('executes FULL reception: updates stock +10 and transitions to RECEIVED', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Full',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receiveUseCase = new ReceivePurchaseOrder(orderRepo);
      const receipt = await receiveUseCase.execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-key-full',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 10 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });

      expect(receipt.receiptNumber).toBe('REC-000001');
      expect(receipt.items.length).toBe(1);
      expect(receipt.items[0].receivedQuantity).toBe(10 * QUANTITY_SCALE);
      expect(receipt.items[0].baseQuantity).toBe(10 * QUANTITY_SCALE);

      // Order status should now be RECEIVED
      const orderAfter = await orderRepo.findWithDetailsById(businessId, order.id);
      expect(orderAfter?.status).toBe('RECEIVED');
      expect(orderAfter?.items[0].pendingQuantity).toBe(0);

      // Inventory check: ENTRY movement generated
      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe('ENTRY');
      expect(movements[0].quantityDelta).toBe(10 * QUANTITY_SCALE);
      expect(movements[0].totalCost).toBe(10000);
      expect(movements[0].referenceType).toBe('PURCHASE_RECEIPT');
    });

    it('executes PARTIAL reception (6 of 10), then remaining (4 of 10)', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Partial',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receiveUseCase = new ReceivePurchaseOrder(orderRepo);

      // First partial receipt: 6 units
      const receipt1 = await receiveUseCase.execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-key-part-1',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 6 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });
      expect(receipt1.receiptNumber).toBe('REC-000001');

      const orderAfter1 = await orderRepo.findWithDetailsById(businessId, order.id);
      expect(orderAfter1?.status).toBe('PARTIALLY_RECEIVED');
      expect(orderAfter1?.items[0].receivedQuantity).toBe(6 * QUANTITY_SCALE);
      expect(orderAfter1?.items[0].pendingQuantity).toBe(4 * QUANTITY_SCALE);

      // Attempt over-receipt: pending is 4, trying to receive 5
      await expect(
        receiveUseCase.execute(businessId, {
          purchaseOrderId: order.id,
          receivedByUserId: 'user-1',
          receivedByNameSnapshot: 'Dueño',
          idempotencyKey: 'receipt-key-over',
          items: [
            {
              purchaseOrderItemId: order.items[0].id,
              receivedQuantity: 5 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
        })
      ).rejects.toThrow('RECEIPT_QUANTITY_EXCEEDS_PENDING');

      // Second partial receipt: remaining 4 units
      const receipt2 = await receiveUseCase.execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-key-part-2',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 4 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });
      expect(receipt2.receiptNumber).toBe('REC-000002');

      const orderAfter2 = await orderRepo.findWithDetailsById(businessId, order.id);
      expect(orderAfter2?.status).toBe('RECEIVED');
      expect(orderAfter2?.items[0].receivedQuantity).toBe(10 * QUANTITY_SCALE);
      expect(orderAfter2?.items[0].pendingQuantity).toBe(0);

      // Inventory check: total +10 (6 + 4)
      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements.length).toBe(2);
      const totalStock = movements.reduce((sum, m) => sum + m.quantityDelta, 0);
      expect(totalStock).toBe(10 * QUANTITY_SCALE);
    });
  });

  describe('4. Presentations, Fractional Quantities & Non-Divisible WAC', () => {
    it('correctly scales presentation: 2 Pack x6 => +12 base units', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Packs',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              presentationId: 'pack-6',
              productNameSnapshot: prod.name,
              presentationNameSnapshot: 'Pack x6',
              baseUnit: prod.baseUnit,
              presentationFactor: 6,
              orderedQuantity: 2 * QUANTITY_SCALE, // 2 packs
              unitCost: 6000, // $6.000 per pack
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receipt = await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-pack-1',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 2 * QUANTITY_SCALE,
            unitCost: 6000,
          },
        ],
      });

      expect(receipt.items[0].receivedQuantity).toBe(2 * QUANTITY_SCALE);
      expect(receipt.items[0].baseQuantity).toBe(12 * QUANTITY_SCALE); // 2 * 6 = 12 units
      expect(receipt.items[0].lineCostTotal).toBe(12000); // 2 * 6000 = 12000

      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements[0].quantityDelta).toBe(12 * QUANTITY_SCALE);
      expect(movements[0].totalCost).toBe(12000);
    });

    it('correctly handles fractional quantities: 2.750 KG scaled integer', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Granel',
      });
      const arroz = (await productRepo.getById('prod-arroz', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: arroz.id,
              productNameSnapshot: arroz.name,
              baseUnit: 'KG',
              presentationFactor: 1,
              orderedQuantity: 5 * QUANTITY_SCALE, // 5.000 KG
              unitCost: 900,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receipt = await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-fractional-1',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 2750, // 2.750 KG
            unitCost: 900,
          },
        ],
      });

      expect(receipt.items[0].receivedQuantity).toBe(2750);
      expect(receipt.items[0].baseQuantity).toBe(2750);
      expect(receipt.items[0].lineCostTotal).toBe(Math.round((2750 * 900) / 1000)); // 2475

      const movements = await movementRepo.listByProduct(arroz.id, businessId);
      expect(movements[0].quantityDelta).toBe(2750);
    });

    it('preserves exact economic value on non-divisible costs (Pack x3 @ $1.000 => total $1.000, not $999)', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Indivisible',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 3,
              orderedQuantity: 1 * QUANTITY_SCALE, // 1 pack of 3
              unitCost: 1000, // $1.000 total per pack
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receipt = await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-indivisible-1',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 1 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });

      expect(receipt.items[0].baseQuantity).toBe(3 * QUANTITY_SCALE); // 3 units
      expect(receipt.items[0].lineCostTotal).toBe(1000); // exactly $1.000

      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements[0].quantityDelta).toBe(3000);
      expect(movements[0].totalCost).toBe(1000);

      // WAC Calculation test
      const wac = calculateSequentialWAC(movements);
      expect(wac.currentStock).toBe(3000);
      expect(wac.inventoryValue).toBe(1000); // preserved total value
    });

    it('calculates WAC correctly: existing 10 @ $1.000 + incoming 10 @ $2.000 => WAC $1.500', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor WAC Test',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      // Initial Stock: 10 units @ 1000
      await movementRepo.recordMovement({
        businessId,
        productId: prod.id,
        movementType: 'OPENING',
        quantityDelta: 10 * QUANTITY_SCALE,
        unitCost: 1000,
        totalCost: 10000,
        createdByUserId: 'user-1',
        occurredAt: '2026-08-01T10:00:00Z',
      });

      // Purchase Order: 10 units @ 2000
      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 2000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      // Receive 10 units @ 2000
      await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-wac-1',
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 10 * QUANTITY_SCALE,
            unitCost: 2000,
          },
        ],
      });

      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements.length).toBe(2);

      const wac = calculateSequentialWAC(movements);
      expect(wac.currentStock).toBe(20 * QUANTITY_SCALE); // 20 units
      expect(wac.inventoryValue).toBe(30000); // 10000 + 20000 = 30000
      expect(wac.averageUnitCost).toBe(1500); // (10000 + 20000) / 20 = 1500
      expect(wac.costQuality).toBe('REAL');
    });
  });

  describe('5. Lot Tracking, Conflict Detection & Idempotency', () => {
    it('creates and reuses lot, and blocks on LOT_CONFLICT (expiration mismatch)', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Lotes',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order1 = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      // First receipt with LOT-001 (expiration 2026-10-01)
      const receipt1 = await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order1.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-lot-1',
        items: [
          {
            purchaseOrderItemId: order1.items[0].id,
            receivedQuantity: 5 * QUANTITY_SCALE,
            unitCost: 1000,
            lotCode: 'LOT-001',
            expirationDate: '2026-10-01',
          },
        ],
      });

      expect(receipt1.items[0].lotId).toBeDefined();
      const lotId = receipt1.items[0].lotId;

      // Second receipt: same LOT-001 with SAME expiration -> Reused
      const receipt2 = await new ReceivePurchaseOrder(orderRepo).execute(businessId, {
        purchaseOrderId: order1.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey: 'receipt-lot-2',
        items: [
          {
            purchaseOrderItemId: order1.items[0].id,
            receivedQuantity: 5 * QUANTITY_SCALE,
            unitCost: 1000,
            lotCode: 'LOT-001',
            expirationDate: '2026-10-01',
          },
        ],
      });
      expect(receipt2.items[0].lotId).toBe(lotId);

      // Order 2: attempt to receive LOT-001 with DIFFERENT expiration -> LOT_CONFLICT
      const order2 = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 5 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      await expect(
        new ReceivePurchaseOrder(orderRepo).execute(businessId, {
          purchaseOrderId: order2.id,
          receivedByUserId: 'user-1',
          receivedByNameSnapshot: 'Dueño',
          idempotencyKey: 'receipt-lot-conflict',
          items: [
            {
              purchaseOrderItemId: order2.items[0].id,
              receivedQuantity: 5 * QUANTITY_SCALE,
              unitCost: 1000,
              lotCode: 'LOT-001',
              expirationDate: '2026-11-01', // conflict!
            },
          ],
        })
      ).rejects.toThrow('LOT_CONFLICT');
    });

    it('idempotency: retrying same receipt returns existing receipt without duplicate stock', async () => {
      const supplier = await new CreateSupplier(supplierRepo).execute(businessId, {
        name: 'Proveedor Idempotency',
      });
      const prod = (await productRepo.getById('prod-coca', businessId))!;

      const order = await new CreatePurchaseOrder(orderRepo, supplierRepo).execute(
        businessId,
        {
          supplierId: supplier.id,
          currencyCode: 'CLP',
          items: [
            {
              productId: prod.id,
              productNameSnapshot: prod.name,
              baseUnit: prod.baseUnit,
              presentationFactor: 1,
              orderedQuantity: 10 * QUANTITY_SCALE,
              unitCost: 1000,
            },
          ],
          status: 'ORDERED',
        },
        'user-1',
        'Dueño'
      );

      const receiveUseCase = new ReceivePurchaseOrder(orderRepo);
      const idempotencyKey = 'receipt-idempotency-test-key';

      // First call
      const res1 = await receiveUseCase.execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey,
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 10 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });

      // Second call with same idempotencyKey
      const res2 = await receiveUseCase.execute(businessId, {
        purchaseOrderId: order.id,
        receivedByUserId: 'user-1',
        receivedByNameSnapshot: 'Dueño',
        idempotencyKey,
        items: [
          {
            purchaseOrderItemId: order.items[0].id,
            receivedQuantity: 10 * QUANTITY_SCALE,
            unitCost: 1000,
          },
        ],
      });

      expect(res1.id).toBe(res2.id);
      expect(res1.receiptNumber).toBe(res2.receiptNumber);

      // Verify no duplicate ENTRY movements
      const movements = await movementRepo.listByProduct(prod.id, businessId);
      expect(movements.length).toBe(1);
    });
  });
});
