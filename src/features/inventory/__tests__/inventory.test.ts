import { describe, it, expect, beforeEach } from 'vitest';
import {
  toScaledQuantity,
  toMajorQuantity,
  formatQuantity,
  parseQuantityInput,
  validateQuantityForUnit,
} from '../../../domain/common/quantity/Quantity';
import { calculateSequentialWAC } from '../../../domain/inventory/InventoryCost';
import { InventoryMovement } from '../../../domain/inventory/InventoryMovement';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryCategoryRepository } from '../../../infrastructure/repositories/InMemoryCategoryRepository';
import { InMemoryProductPresentationRepository } from '../../../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryInventoryMovementRepository } from '../../../infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../infrastructure/repositories/InMemoryInventoryLotRepository';
import { RecordMovement } from '../../../application/inventory/RecordMovement';
import { GetProductStock } from '../../../application/inventory/GetProductStock';
import { Product } from '../../../domain/catalog/Product';

describe('Inventory Domain & Ledger Verification (AG-05)', () => {
  describe('1. Quantity Model & Scale Invariants', () => {
    it('scales major quantities correctly to fixed scale 1000', () => {
      expect(toScaledQuantity(1)).toBe(1000);
      expect(toScaledQuantity(0.75)).toBe(750);
      expect(toScaledQuantity(1.25)).toBe(1250);
      expect(toScaledQuantity(2.5)).toBe(2500);
      expect(toScaledQuantity(0)).toBe(0);
    });

    it('converts scaled quantities back to major representation without float bugs', () => {
      expect(toMajorQuantity(1000)).toBe(1);
      expect(toMajorQuantity(750)).toBe(0.75);
      expect(toMajorQuantity(1250)).toBe(1.25);
    });

    it('validates unit rules: rejects fractional units for UNIT products', () => {
      expect(validateQuantityForUnit(1000, 'UNIT').valid).toBe(true);
      expect(validateQuantityForUnit(2000, 'UNIT').valid).toBe(true);
      expect(validateQuantityForUnit(1500, 'UNIT').valid).toBe(false);
      expect(validateQuantityForUnit(750, 'KG').valid).toBe(true);
      expect(validateQuantityForUnit(1250, 'L').valid).toBe(true);
    });

    it('formats quantities nicely according to base unit', () => {
      expect(formatQuantity(1000, 'UNIT')).toContain('1');
      expect(formatQuantity(1000, 'UNIT')).toContain('u');
      expect(formatQuantity(750, 'KG')).toContain('0,75');
      expect(formatQuantity(750, 'KG')).toContain('kg');
    });

    it('parses user input strings safely', () => {
      expect(parseQuantityInput('5', 'UNIT')).toBe(5000);
      expect(parseQuantityInput('1.5', 'UNIT')).toBe(null); // UNIT does not allow decimal
      expect(parseQuantityInput('1.5', 'KG')).toBe(1500);
      expect(parseQuantityInput('0,750', 'KG')).toBe(750);
    });
  });

  describe('2. Sequential Weighted Average Cost (WAC) State Machine', () => {
    it('calculates WAC correctly on entries with cost and preserves on waste', () => {
      const bizId = 'biz-1';
      const prodId = 'prod-1';

      const movements: InventoryMovement[] = [
        {
          id: '1',
          businessId: bizId,
          productId: prodId,
          movementType: 'OPENING' as const,
          quantityDelta: 10000, // 10 units
          unitCost: 1000, // $1000
          createdByUserId: 'user-1',
          occurredAt: '2026-08-20T10:00:00Z',
          createdAt: '2026-08-20T10:00:00Z',
        },
        {
          id: '2',
          businessId: bizId,
          productId: prodId,
          movementType: 'ENTRY' as const,
          quantityDelta: 10000, // 10 units
          unitCost: 1200, // $1200
          createdByUserId: 'user-1',
          occurredAt: '2026-08-20T11:00:00Z',
          createdAt: '2026-08-20T11:00:00Z',
        },
      ];

      // 10 @ 1000 + 10 @ 1200 = 20 @ 1100
      let costState = calculateSequentialWAC(movements);
      expect(costState.currentStock).toBe(20000);
      expect(costState.averageUnitCost).toBe(1100);
      expect(costState.inventoryValue).toBe(22000);
      expect(costState.costQuality).toBe('REAL');

      // Waste of 5 units does NOT change average cost
      movements.push({
        id: '3',
        businessId: bizId,
        productId: prodId,
        movementType: 'WASTE' as const,
        quantityDelta: -5000, // -5 units
        unitCost: null,
        createdByUserId: 'user-1',
        occurredAt: '2026-08-20T12:00:00Z',
        createdAt: '2026-08-20T12:00:00Z',
      });

      costState = calculateSequentialWAC(movements);
      expect(costState.currentStock).toBe(15000);
      expect(costState.averageUnitCost).toBe(1100);
      expect(costState.inventoryValue).toBe(16500);

      // Adjustment in (+5 units without cost) inherits average cost
      movements.push({
        id: '4',
        businessId: bizId,
        productId: prodId,
        movementType: 'ADJUSTMENT_IN' as const,
        quantityDelta: 5000, // +5 units
        unitCost: null,
        createdByUserId: 'user-1',
        occurredAt: '2026-08-20T13:00:00Z',
        createdAt: '2026-08-20T13:00:00Z',
      });

      costState = calculateSequentialWAC(movements);
      expect(costState.currentStock).toBe(20000);
      expect(costState.averageUnitCost).toBe(1100);
      expect(costState.inventoryValue).toBe(22000);
    });

    it('handles stock=0 and zero inventory value', () => {
      const bizId = 'biz-1';
      const prodId = 'prod-1';

      const movements: InventoryMovement[] = [
        {
          id: '1',
          businessId: bizId,
          productId: prodId,
          movementType: 'OPENING' as const,
          quantityDelta: 5000,
          unitCost: 1000,
          createdByUserId: 'user-1',
          occurredAt: '2026-08-20T10:00:00Z',
          createdAt: '2026-08-20T10:00:00Z',
        },
        {
          id: '2',
          businessId: bizId,
          productId: prodId,
          movementType: 'WASTE' as const,
          quantityDelta: -5000,
          createdByUserId: 'user-1',
          occurredAt: '2026-08-20T11:00:00Z',
          createdAt: '2026-08-20T11:00:00Z',
        },
      ];

      const costState = calculateSequentialWAC(movements, 800);
      expect(costState.currentStock).toBe(0);
      expect(costState.inventoryValue).toBe(0);
      expect(costState.lastKnownAverageUnitCost).toBe(1000);
      // When stock is 0 and costPrice fallback is present, it reports reference
      expect(costState.costQuality).toBe('REFERENCE');
      expect(costState.averageUnitCost).toBe(800);
    });
  });

  describe('3. Ledger Movements, Stock Invariants & Negative Stock Protection', () => {
    let movementRepo: InMemoryInventoryMovementRepository;
    let lotRepo: InMemoryInventoryLotRepository;
    let productRepo: InMemoryProductRepository;
    let categoryRepo: InMemoryCategoryRepository;
    let presRepo: InMemoryProductPresentationRepository;
    let recordMovement: RecordMovement;
    let getProductStock: GetProductStock;

    const businessId = 'biz-test-01';
    const userId = 'user-owner-01';
    let testProduct: Product;

    beforeEach(async () => {
      movementRepo = new InMemoryInventoryMovementRepository();
      lotRepo = new InMemoryInventoryLotRepository(movementRepo);
      categoryRepo = new InMemoryCategoryRepository();
      presRepo = new InMemoryProductPresentationRepository();
      productRepo = new InMemoryProductRepository(categoryRepo, presRepo);
      recordMovement = new RecordMovement(movementRepo, lotRepo, productRepo);
      getProductStock = new GetProductStock(productRepo, categoryRepo, movementRepo, lotRepo);

      testProduct = {
        id: 'prod-coca-01',
        businessId,
        name: 'Coca-Cola 350ml',
        baseUnit: 'UNIT',
        salePrice: 1500,
        costPrice: 800,
        minimumStock: 5000, // 5 units scaled
        active: true,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await productRepo.save(testProduct);
    });

    it('executes full sequential lifecycle: 0 -> +20 -> +5 -> -2 waste -> adjust to 21 = 21 exact', async () => {
      // 1. Initial Stock = 0
      let stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(0);
      expect(stockDetail?.status).toBe('OUT_OF_STOCK');

      // 2. Opening +20
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'OPENING',
        quantityDelta: 20000, // 20 units
        unitCost: 800,
        createdByUserId: userId,
      });
      stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(20000);
      expect(stockDetail?.status).toBe('AVAILABLE');

      // 3. Entry +5
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'ENTRY',
        quantityDelta: 5000, // 5 units
        unitCost: 850,
        createdByUserId: userId,
      });
      stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(25000);

      // 4. Waste -2
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'WASTE',
        quantityDelta: -2000, // -2 units
        reasonCode: 'DAMAGED',
        createdByUserId: userId,
      });
      stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(23000);

      // 5. Physical Adjustment to 21 units (diff = -2)
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'ADJUSTMENT_OUT',
        quantityDelta: -2000,
        reasonCode: 'PHYSICAL_COUNT',
        createdByUserId: userId,
      });
      stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(21000);
      expect(stockDetail?.recentMovements.length).toBe(4);
    });

    it('blocks negative stock attempts with friendly domain error', async () => {
      // Stock is currently 0
      await expect(
        recordMovement.execute({
          businessId,
          productId: testProduct.id,
          movementType: 'WASTE',
          quantityDelta: -3000, // -3 units
          reasonCode: 'LOST',
          createdByUserId: userId,
        })
      ).rejects.toThrow(/No puedes registrar una salida mayor al stock disponible/);

      const currentStock = await movementRepo.getCurrentStock(testProduct.id, businessId);
      expect(currentStock).toBe(0);
    });

    it('enforces lot reconciliation and unallocated stock protection', async () => {
      // Create Entry with Lot A (+10)
      const entryLotA = await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'ENTRY',
        quantityDelta: 10000,
        lotCode: 'LOT-A',
        expirationDate: '2026-12-31',
        createdByUserId: userId,
      });

      // Create Entry without Lot (+5)
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        movementType: 'ENTRY',
        quantityDelta: 5000,
        createdByUserId: userId,
      });

      let stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(15000); // 15 total
      expect(stockDetail?.lots.length).toBe(1);
      expect(stockDetail?.lots[0].currentStock).toBe(10000); // Lot A = 10
      expect(stockDetail?.unallocatedStock).toBe(5000); // Unallocated = 5

      // Output without lot when attempting 6 units (exceeds unallocated 5) should be rejected
      await expect(
        recordMovement.execute({
          businessId,
          productId: testProduct.id,
          movementType: 'WASTE',
          quantityDelta: -6000, // -6 units without lot
          reasonCode: 'DAMAGED',
          createdByUserId: userId,
        })
      ).rejects.toThrow(/No puedes registrar una salida sin lote mayor al stock no asignado disponible/);

      // Waste from Lot A (-2) succeeds and reduces Lot A to 8
      await recordMovement.execute({
        businessId,
        productId: testProduct.id,
        lotId: entryLotA.lotId,
        movementType: 'WASTE',
        quantityDelta: -2000,
        reasonCode: 'EXPIRED',
        createdByUserId: userId,
      });

      stockDetail = await getProductStock.execute(testProduct.id, businessId);
      expect(stockDetail?.currentStock).toBe(13000); // Total 13
      expect(stockDetail?.lots[0].currentStock).toBe(8000); // Lot A = 8
      expect(stockDetail?.unallocatedStock).toBe(5000); // Unallocated = 5
    });

    it('enforces multi-business isolation', async () => {
      const bizA = 'biz-A';
      const bizB = 'biz-B';

      const prodA: Product = {
        id: 'prod-a-01',
        businessId: bizA,
        name: 'Arroz 1kg',
        baseUnit: 'KG',
        salePrice: 1000,
        active: true,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await productRepo.save(prodA);

      const prodB: Product = {
        id: 'prod-b-01',
        businessId: bizB,
        name: 'Arroz 1kg',
        baseUnit: 'KG',
        salePrice: 1000,
        active: true,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await productRepo.save(prodB);

      await recordMovement.execute({
        businessId: bizA,
        productId: prodA.id,
        movementType: 'ENTRY',
        quantityDelta: 10000, // 10 kg
        createdByUserId: userId,
      });

      const stockA = await movementRepo.getCurrentStock(prodA.id, bizA);
      const stockB = await movementRepo.getCurrentStock(prodB.id, bizB);

      expect(stockA).toBe(10000);
      expect(stockB).toBe(0);
    });
  });
});
