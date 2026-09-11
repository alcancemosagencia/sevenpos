import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { AuditService } from '../application/audit/AuditService';

describe('AG-12D: Audit KPI Failed Attempts Semantics', () => {
  let repository: InMemoryAuditRepository;
  let service: AuditService;
  const businessId = 'biz-kpi-test';

  beforeEach(() => {
    repository = new InMemoryAuditRepository();
    service = new AuditService(repository, repository);
  });

  it('should count only real auth.pin.failed attempts and not double count auth.pin.locked', async () => {
    const now = new Date();
    const iso = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();

    // 1. First PIN failure
    await service.recordEvent({
      businessId,
      eventCategory: 'AUTH',
      eventType: 'auth.pin.failed',
      action: 'PIN_AUTH_FAILED',
      severity: 'WARNING',
      deviceId: 'dev-001',
      entityType: 'AUTH',
      entityId: 'dev-001',
      entityLabel: 'Terminal PIN',
      summary: 'Intento de PIN fallido (intento 1 de 3)',
      occurredAt: iso(30),
    });

    // 2. Second PIN failure
    await service.recordEvent({
      businessId,
      eventCategory: 'AUTH',
      eventType: 'auth.pin.failed',
      action: 'PIN_AUTH_FAILED',
      severity: 'WARNING',
      deviceId: 'dev-001',
      entityType: 'AUTH',
      entityId: 'dev-001',
      entityLabel: 'Terminal PIN',
      summary: 'Intento de PIN fallido (intento 2 de 3)',
      occurredAt: iso(20),
    });

    // 3. Third PIN failure (leads to lockout)
    await service.recordEvent({
      businessId,
      eventCategory: 'AUTH',
      eventType: 'auth.pin.failed',
      action: 'PIN_AUTH_FAILED',
      severity: 'WARNING',
      deviceId: 'dev-001',
      entityType: 'AUTH',
      entityId: 'dev-001',
      entityLabel: 'Terminal PIN',
      summary: 'Intento de PIN fallido (intento 3 de 3)',
      occurredAt: iso(10),
    });

    // 4. Lockout triggered as a consequence
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
      summary: 'Terminal bloqueado por 3 intentos fallidos consecutivos de PIN',
      occurredAt: iso(10),
    });

    const kpis = await service.getKpis(businessId);

    // Total events: 4
    expect(kpis.totalEvents24h).toBe(4);
    // Security events: 4 (all 4 are AUTH)
    expect(kpis.securityEventsCount).toBe(4);
    // Critical events: 0 (all are WARNING)
    expect(kpis.criticalEventsCount).toBe(0);
    // Failed attempts: EXACTLY 3 (auth.pin.failed only, not 4)
    expect(kpis.failedAttemptsCount).toBe(3);
  });
});
