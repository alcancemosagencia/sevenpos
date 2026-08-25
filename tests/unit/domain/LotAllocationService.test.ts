import { describe, it, expect } from 'vitest';
import { allocateStockForSale } from '../../../src/domain/inventory/services/LotAllocationService';

describe('LotAllocationService — Unallocated First + Basic FEFO Engine (AG-06)', () => {
  it('consumes unallocated stock first when sufficient', () => {
    const unallocatedStock = 10000; // 10 units
    const lots = [
      { id: 'lot_1', lotCode: 'LOT-A', expirationDate: '2026-09-10', currentStock: 5000, createdAt: '2026-08-01' },
    ];

    const result = allocateStockForSale(4000, unallocatedStock, lots);

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([
      { lotId: null, quantity: 4000 },
    ]);
  });

  it('performs multi-lot allocation: unallocated first, then FEFO lots', () => {
    // Example from user specifications:
    // Sin lote = 2 units (2000)
    // Lote A (vence 10/09) = 5 units (5000)
    // Lote B (vence 15/10) = 10 units (10000)
    // Venta de 6 units (6000) -> 2000 sin lote + 4000 Lote A
    const unallocatedStock = 2000;
    const lots = [
      { id: 'lot_b', lotCode: 'LOT-B', expirationDate: '2026-10-15', currentStock: 10000, createdAt: '2026-08-05' },
      { id: 'lot_a', lotCode: 'LOT-A', expirationDate: '2026-09-10', currentStock: 5000, createdAt: '2026-08-01' },
    ];

    const result = allocateStockForSale(6000, unallocatedStock, lots);

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([
      { lotId: null, quantity: 2000 },
      { lotId: 'lot_a', quantity: 4000 },
    ]);
  });

  it('handles multi-lot cascading across unallocated, Lot A, and Lot B', () => {
    // Sin lote = 1000
    // Lote A (vence 2026-09-10) = 2000
    // Lote B (vence 2026-10-15) = 5000
    // Venta de 4000 -> 1000 sin lote + 2000 Lote A + 1000 Lote B
    const unallocatedStock = 1000;
    const lots = [
      { id: 'lot_a', expirationDate: '2026-09-10', currentStock: 2000, createdAt: '2026-08-01' },
      { id: 'lot_b', expirationDate: '2026-10-15', currentStock: 5000, createdAt: '2026-08-02' },
    ];

    const result = allocateStockForSale(4000, unallocatedStock, lots);

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([
      { lotId: null, quantity: 1000 },
      { lotId: 'lot_a', quantity: 2000 },
      { lotId: 'lot_b', quantity: 1000 },
    ]);
  });

  it('puts lots with expiration date before lots without expiration date', () => {
    const unallocatedStock = 0;
    const lots = [
      { id: 'lot_no_exp', expirationDate: null, currentStock: 5000, createdAt: '2026-07-01' },
      { id: 'lot_with_exp', expirationDate: '2026-12-31', currentStock: 5000, createdAt: '2026-08-01' },
    ];

    const result = allocateStockForSale(3000, unallocatedStock, lots);

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([
      { lotId: 'lot_with_exp', quantity: 3000 },
    ]);
  });

  it('rejects allocation when total stock is insufficient', () => {
    const unallocatedStock = 1000;
    const lots = [
      { id: 'lot_1', expirationDate: '2026-09-10', currentStock: 1000, createdAt: '2026-08-01' },
    ];

    const result = allocateStockForSale(3000, unallocatedStock, lots);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Stock insuficiente');
  });
});
