import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { User } from '../domain/user/User';

describe('Audit - Canonical Schema & Operational User Attribution', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  let owner: User;
  let cashier: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault);

    const resO = await userService.createUser({
      businessId: 'biz-audit-canonical',
      firstName: 'Elena',
      lastName: 'Dueña',
      role: 'OWNER',
      pin: '1234',
    });
    owner = resO.user!;

    const resC = await userService.createUser(
      {
        businessId: 'biz-audit-canonical',
        firstName: 'Carlos',
        lastName: 'Cajero',
        role: 'CASHIER',
        pin: '5678',
      },
      owner
    );
    cashier = resC.user!;
  });

  it('records CASHIER operation in audit_events with canonical actor fields (actor_user_id, actor_name_snapshot, actor_role_snapshot)', async () => {
    const loginRes = await userService.verifyUserPin('biz-audit-canonical', cashier.id, '5678');
    expect(loginRes.success).toBe(true);

    const auditQueryRepo = repositoryFactory.getAuditQueryRepository();
    const result = await auditQueryRepo.query('biz-audit-canonical', {});
    expect(result.items.length).toBeGreaterThan(0);

    const sessionEvent = result.items.find((e) => e.eventType === 'user.session_started');
    expect(sessionEvent).toBeDefined();
    expect(sessionEvent?.actorUserId).toBe(cashier.id);
    expect(sessionEvent?.actorNameSnapshot).toBe('Carlos Cajero');
    expect(sessionEvent?.actorRoleSnapshot).toBe('CASHIER');

    // Renaming user does NOT mutate the historical audit event display snapshot
    await userRepo.updateUser({
      ...cashier,
      firstName: 'Carlos Renombrado',
    });

    const resultAfterRename = await auditQueryRepo.query('biz-audit-canonical', {});
    const historicalEvent = resultAfterRename.items.find((e) => e.eventType === 'user.session_started');
    expect(historicalEvent?.actorNameSnapshot).toBe('Carlos Cajero');
    expect(historicalEvent?.actorRoleSnapshot).toBe('CASHIER');
  });
});
