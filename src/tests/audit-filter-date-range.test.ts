import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';

describe('AG-12C: Date Range Query Filtering in Audit Repository', () => {
  it('correctly applies start and end timestamp filters in database query', async () => {
    const repo = new InMemoryAuditRepository();
    const bizId = 'biz-test-dates';

    await repo.appendBatch([
      {
        businessId: bizId,
        eventCategory: 'SALES',
        eventType: 'sale.completed',
        action: 'SALE',
        severity: 'INFO',
        entityType: 'SALE',
        entityId: 's1',
        summary: 'Venta 1 de Agosto',
        occurredAt: '2026-08-01T12:00:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'SALES',
        eventType: 'sale.completed',
        action: 'SALE',
        severity: 'INFO',
        entityType: 'SALE',
        entityId: 's2',
        summary: 'Venta 15 de Agosto',
        occurredAt: '2026-08-15T12:00:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'SALES',
        eventType: 'sale.completed',
        action: 'SALE',
        severity: 'INFO',
        entityType: 'SALE',
        entityId: 's3',
        summary: 'Venta 1 de Septiembre',
        occurredAt: '2026-09-01T12:00:00.000Z',
      },
    ]);

    // Query August only
    const augResult = await repo.query(bizId, {
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.999Z',
    });
    expect(augResult.items.length).toBe(2);
    expect(augResult.items.map((e) => e.entityId).sort()).toEqual(['s1', 's2']);

    // Query September only
    const septResult = await repo.query(bizId, {
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.999Z',
    });
    expect(septResult.items.length).toBe(1);
    expect(septResult.items[0].entityId).toBe('s3');
  });
});
