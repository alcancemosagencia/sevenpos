import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { AuditService } from '../application/audit/AuditService';

describe('AG-12D: Audit KPI Critical Events Semantics & No Warning Escalation', () => {
  let repository: InMemoryAuditRepository;
  let service: AuditService;
  const businessId = 'biz-critical-test';

  beforeEach(() => {
    repository = new InMemoryAuditRepository();
    service = new AuditService(repository, repository);
  });

  it('should strictly count only CRITICAL severity events and not escalate WARNING events', async () => {
    const now = new Date();
    const iso = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();

    // 1. Critical event (e.g. system failure)
    await service.recordEvent({
      businessId,
      eventCategory: 'SYSTEM',
      eventType: 'system.database.corrupted',
      action: 'DATABASE_ERROR',
      severity: 'CRITICAL',
      entityType: 'DATABASE',
      entityId: 'sqlite-main',
      entityLabel: 'Base de datos principal',
      summary: 'Error crítico en lectura de base de datos',
      occurredAt: iso(60),
    });

    // 2. Warning: Cash discrepancy (should remain WARNING, not CRITICAL)
    await service.recordEvent({
      businessId,
      eventCategory: 'CASH',
      eventType: 'cash.discrepancy.detected',
      action: 'CASH_DISCREPANCY',
      severity: 'WARNING',
      entityType: 'CASH_SESSION',
      entityId: 'shift-01',
      entityLabel: 'Cierre Turno Tarde',
      summary: 'Diferencia de caja detectada: -$5.000',
      occurredAt: iso(40),
    });

    // 3. Warning: PIN lockout (should remain WARNING)
    await service.recordEvent({
      businessId,
      eventCategory: 'AUTH',
      eventType: 'auth.pin.locked',
      action: 'PIN_AUTH_LOCKED',
      severity: 'WARNING',
      deviceId: 'dev-001',
      entityType: 'AUTH',
      entityId: 'dev-001',
      entityLabel: 'Terminal PIN',
      summary: 'Terminal bloqueado por intentos fallidos',
      occurredAt: iso(20),
    });

    // 4. Info event: Normal sale
    await service.recordEvent({
      businessId,
      eventCategory: 'SALES',
      eventType: 'sale.completed',
      action: 'SALE_COMPLETED',
      severity: 'INFO',
      entityType: 'SALE',
      entityId: 'vta-001',
      entityLabel: 'Boleta VTA-000001',
      summary: 'Venta completada por CLP $12.000',
      occurredAt: iso(10),
    });

    const kpis = await service.getKpis(businessId);

    expect(kpis.totalEvents24h).toBe(4);
    // Critical events count must be EXACTLY 1 (only the CRITICAL severity event)
    expect(kpis.criticalEventsCount).toBe(1);
  });
});
