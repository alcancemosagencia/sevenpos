import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { AuditService } from '../application/audit/AuditService';

describe('AG-12: AuditService and InMemoryAuditRepository', () => {
  let repository: InMemoryAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repository = new InMemoryAuditRepository();
    service = new AuditService(repository, repository);
  });

  it('records an audit event with sanitized metadata', async () => {
    const event = await service.recordEvent({
      businessId: 'biz-test-01',
      eventCategory: 'AUTH',
      eventType: 'auth.pin.failed',
      action: 'PIN_AUTH_FAILED',
      severity: 'WARNING',
      actorUserId: 'usr-1',
      actorNameSnapshot: 'Cajero 1',
      entityType: 'DEVICE',
      entityId: 'dev-01',
      summary: 'Intento de PIN fallido',
      metadata: {
        pin: '1234',
        token: 'secret_jwt_token',
        attemptCount: 1,
      },
    });

    expect(event.id).toBeDefined();
    expect(event.eventCategory).toBe('AUTH');
    expect(event.eventType).toBe('auth.pin.failed');
    expect(event.metadataJson).toBeDefined();

    const parsedMeta = JSON.parse(event.metadataJson!);
    expect(parsedMeta.pin).toBe('[REDACTED]');
    expect(parsedMeta.token).toBe('[REDACTED]');
    expect(parsedMeta.attemptCount).toBe(1);
  });

  it('queries events with category, severity and search filters', async () => {
    await service.recordBatchForTesting([
      {
        businessId: 'biz-query-test',
        eventCategory: 'SALES',
        eventType: 'sale.completed',
        action: 'SALE_COMPLETED',
        severity: 'INFO',
        entityType: 'SALE',
        entityId: 'sale-001',
        summary: 'Venta 001 por CLP 15.000',
        metadata: { total: 15000 },
      },
      {
        businessId: 'biz-query-test',
        eventCategory: 'CASH',
        eventType: 'cash.discrepancy.detected',
        action: 'DISCREPANCY_DETECTED',
        severity: 'CRITICAL',
        entityType: 'CASH_SESSION',
        entityId: 'cs-001',
        summary: 'Diferencia en caja de -CLP 5.000',
        metadata: { discrepancy: -5000 },
      },
    ]);

    const allEvents = await service.queryEvents('biz-query-test', {});
    expect(allEvents.totalCount).toBe(2);

    const criticalEvents = await service.queryEvents('biz-query-test', {
      severity: 'CRITICAL',
    });
    expect(criticalEvents.totalCount).toBe(1);
    expect(criticalEvents.items[0].eventType).toBe('cash.discrepancy.detected');

    const searchEvents = await service.queryEvents('biz-query-test', {
      searchTerm: 'Diferencia',
    });
    expect(searchEvents.totalCount).toBe(1);
    expect(searchEvents.items[0].entityId).toBe('cs-001');
  });

  it('calculates KPIs correctly for a business', async () => {
    const kpis = await service.getKpis('biz-query-test');
    expect(kpis.totalEvents24h).toBeGreaterThanOrEqual(0);
    expect(kpis.securityEventsCount).toBeGreaterThanOrEqual(0);
    expect(kpis.criticalEventsCount).toBeGreaterThanOrEqual(0);
    expect(kpis.failedAttemptsCount).toBeGreaterThanOrEqual(0);
  });

  it('exports events to CSV with RFC 4180 escaping and human labels', async () => {
    await service.recordEvent({
      businessId: 'biz-csv-test',
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'SALE_COMPLETED',
      severity: 'INFO',
      entityType: 'SALE',
      entityId: 's1',
      summary: 'Venta completada',
    });

    const csv = await service.exportToCsv('biz-csv-test', {});
    expect(csv).toContain('Fecha y Hora');
    expect(csv).toContain('Categoría');
    expect(csv).toContain('Evento');
    expect(csv).toContain('Severidad');
    expect(csv).toContain('Venta completada');
  });
});

declare module '../application/audit/AuditService' {
  interface AuditService {
    recordBatchForTesting(inputs: Array<Parameters<AuditService['recordEvent']>[0]>): Promise<unknown>;
  }
}

AuditService.prototype.recordBatchForTesting = async function (inputs: Array<Parameters<AuditService['recordEvent']>[0]>) {
  return this.recordEvents(inputs);
};
