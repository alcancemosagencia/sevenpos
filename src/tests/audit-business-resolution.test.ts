import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';

describe('AG-12C: Tenant Safety & Business Isolation in Audit Queries', () => {
  it('strictly isolates audit events between distinct business tenants', async () => {
    const repo = new InMemoryAuditRepository();
    const bizA = 'tenant-corp-alpha';
    const bizB = 'tenant-corp-beta';

    await repo.append({
      businessId: bizA,
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'SALE',
      severity: 'INFO',
      entityType: 'SALE',
      entityId: 'sale-a1',
      summary: 'Venta de Empresa Alpha',
      occurredAt: '2026-09-01T12:00:00.000Z',
    });

    await repo.append({
      businessId: bizB,
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'SALE',
      severity: 'INFO',
      entityType: 'SALE',
      entityId: 'sale-b1',
      summary: 'Venta de Empresa Beta',
      occurredAt: '2026-09-01T12:05:00.000Z',
    });

    // Query Tenant A -> strictly returns only Tenant A's events
    const resA = await repo.query(bizA, {});
    expect(resA.items.length).toBe(1);
    expect(resA.items[0].summary).toBe('Venta de Empresa Alpha');

    // Query Tenant B -> strictly returns only Tenant B's events
    const resB = await repo.query(bizB, {});
    expect(resB.items.length).toBe(1);
    expect(resB.items[0].summary).toBe('Venta de Empresa Beta');

    // Query unassociated tenant -> returns 0 events
    const resUnregistered = await repo.query('tenant-non-existent', {});
    expect(resUnregistered.items.length).toBe(0);
    expect(resUnregistered.totalCount).toBe(0);
  });
});
