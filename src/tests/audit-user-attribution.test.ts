import { describe, it, expect } from 'vitest';
import { AuditService } from '../application/audit/AuditService';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';

describe('AG-13B: Audit User Attribution Contract', () => {
  it('records actorUserId, actorNameSnapshot and businessId for all audit actions without missing author context', async () => {
    const auditRepo = new InMemoryAuditRepository();
    const auditService = new AuditService(auditRepo, auditRepo);

    await auditService.recordEvent({
      businessId: 'biz-test-unique-01',
      actorUserId: 'usr-admin-999',
      actorNameSnapshot: 'Admin Principal',
      actorRoleSnapshot: 'OWNER',
      deviceId: 'dev-desktop-01',
      eventType: 'user.created',
      eventCategory: 'SETTINGS',
      action: 'CREATE',
      entityType: 'user',
      entityId: 'usr-new-001',
      summary: 'Usuario creado',
      metadata: { targetUserId: 'usr-new-001', role: 'CASHIER' },
    });

    const res = await auditRepo.query('biz-test-unique-01', {});
    expect(res.items.length).toBe(1);
    expect(res.items[0].actorUserId).toBe('usr-admin-999');
    expect(res.items[0].actorNameSnapshot).toBe('Admin Principal');
    expect(res.items[0].eventType).toBe('user.created');
  });
});
