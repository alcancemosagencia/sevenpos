import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';

describe('AG-12C: Device ID Query Filtering in Audit Repository', () => {
  it('correctly filters audit events by physical deviceId', async () => {
    const repo = new InMemoryAuditRepository();
    const bizId = 'biz-test-device';

    await repo.appendBatch([
      {
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: 'auth.login.success',
        action: 'LOGIN',
        severity: 'INFO',
        deviceId: 'device-terminal-pc-01',
        deviceNameSnapshot: 'Caja Principal (PC)',
        entityType: 'SESSION',
        entityId: 'u1',
        summary: 'Acceso en PC',
        occurredAt: '2026-09-01T10:00:00.000Z',
      },
      {
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: 'auth.login.success',
        action: 'LOGIN',
        severity: 'INFO',
        deviceId: 'device-mobile-pos-02',
        deviceNameSnapshot: 'Terminal Móvil',
        entityType: 'SESSION',
        entityId: 'u1',
        summary: 'Acceso en Móvil',
        occurredAt: '2026-09-01T10:05:00.000Z',
      },
    ]);

    const pcOnly = await repo.query(bizId, { deviceId: 'device-terminal-pc-01' });
    expect(pcOnly.items.length).toBe(1);
    expect(pcOnly.items[0].deviceNameSnapshot).toBe('Caja Principal (PC)');

    const mobileOnly = await repo.query(bizId, { deviceId: 'device-mobile-pos-02' });
    expect(mobileOnly.items.length).toBe(1);
    expect(mobileOnly.items[0].deviceNameSnapshot).toBe('Terminal Móvil');
  });
});
