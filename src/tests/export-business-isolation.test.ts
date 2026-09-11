import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { AuditService } from '../application/audit/AuditService';

describe('Export Business Isolation (Tenant Boundary Enforced)', () => {
  it('strictly isolates exported audit records to the requesting businessId', async () => {
    const repo = new InMemoryAuditRepository();
    const service = new AuditService(repo, repo);

    // Business A Event
    await service.recordEvent({
      businessId: 'biz-tenant-alpha',
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'Venta Alpha',
      severity: 'INFO',
      entityType: 'sale',
      entityId: 'sale-alpha-1',
      summary: 'Venta de Tenant Alpha',
    });

    // Business B Event
    await service.recordEvent({
      businessId: 'biz-tenant-beta',
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'Venta Beta',
      severity: 'INFO',
      entityType: 'sale',
      entityId: 'sale-beta-1',
      summary: 'Venta de Tenant Beta',
    });

    // Export for Alpha
    const alphaExport = await service.getExportData('biz-tenant-alpha', {});
    expect(alphaExport.rows.length).toBe(1);
    expect(alphaExport.rows[0][7]).toBe('Venta de Tenant Alpha');

    // Export for Beta
    const betaExport = await service.getExportData('biz-tenant-beta', {});
    expect(betaExport.rows.length).toBe(1);
    expect(betaExport.rows[0][7]).toBe('Venta de Tenant Beta');
  });
});
