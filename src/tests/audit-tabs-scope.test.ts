import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';

describe('AG-12C: Multi-Category Tab Scoping in Audit Repository', () => {
  it('correctly filters events for each tab scope without in-memory React post-filtering', async () => {
    const repo = new InMemoryAuditRepository();
    const bizId = 'biz-test-tabs';

    await repo.appendBatch([
      {
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: 'auth.login.success',
        action: 'LOGIN',
        severity: 'INFO',
        entityType: 'SESSION',
        entityId: 'u1',
        summary: 'Login exitoso',
        occurredAt: '2026-09-01T10:00:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'DEVICE',
        eventType: 'device.enrolled',
        action: 'ENROLL',
        severity: 'INFO',
        entityType: 'DEVICE',
        entityId: 'd1',
        summary: 'Dispositivo enrolado',
        occurredAt: '2026-09-01T10:05:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'SALES',
        eventType: 'sale.completed',
        action: 'SALE',
        severity: 'INFO',
        entityType: 'SALE',
        entityId: 's1',
        summary: 'Venta completada',
        occurredAt: '2026-09-01T10:10:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'CASH',
        eventType: 'cash.shift.opened',
        action: 'CASH_OPEN',
        severity: 'INFO',
        entityType: 'CASH_SESSION',
        entityId: 'c1',
        summary: 'Caja abierta',
        occurredAt: '2026-09-01T10:15:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'INVENTORY',
        eventType: 'inventory.adjustment.created',
        action: 'ADJUSTMENT',
        severity: 'INFO',
        entityType: 'INVENTORY',
        entityId: 'i1',
        summary: 'Ajuste inventario',
        occurredAt: '2026-09-01T10:20:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'CATALOG',
        eventType: 'product.created',
        action: 'PRODUCT_CREATE',
        severity: 'INFO',
        entityType: 'PRODUCT',
        entityId: 'p1',
        summary: 'Producto creado',
        occurredAt: '2026-09-01T10:25:00.000Z',
      },
    ]);

    // 1. Tab "Todos": categories = undefined -> returns all 6 events
    const allResult = await repo.query(bizId, {});
    expect(allResult.items.length).toBe(6);

    // 2. Tab "Seguridad y Acceso": categories = ['AUTH', 'DEVICE'] -> returns 2 events
    const securityResult = await repo.query(bizId, { categories: ['AUTH', 'DEVICE'] });
    expect(securityResult.items.length).toBe(2);
    expect(securityResult.items.map((e) => e.eventCategory).sort()).toEqual(['AUTH', 'DEVICE']);

    // 3. Tab "Ventas y Caja": categories = ['SALES', 'CASH'] -> returns 2 events
    const salesResult = await repo.query(bizId, { categories: ['SALES', 'CASH'] });
    expect(salesResult.items.length).toBe(2);
    expect(salesResult.items.map((e) => e.eventCategory).sort()).toEqual(['CASH', 'SALES']);

    // 4. Tab "Inventario y Catálogo": categories = ['INVENTORY', 'CATALOG'] -> returns 2 events
    const inventoryResult = await repo.query(bizId, { categories: ['INVENTORY', 'CATALOG'] });
    expect(inventoryResult.items.length).toBe(2);
    expect(inventoryResult.items.map((e) => e.eventCategory).sort()).toEqual(['CATALOG', 'INVENTORY']);
  });
});
