import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { User } from '../domain/user/User';

describe('Audit - Operational User Attribution & Snapshot Immutability', () => {
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
      businessId: 'biz-1',
      firstName: 'Dueño',
      role: 'OWNER',
      pin: '1234',
    });
    owner = resO.user!;

    const resC = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Carlos',
        lastName: 'Cajero',
        role: 'CASHIER',
        pin: '5678',
      },
      owner
    );
    cashier = resC.user!;
  });

  it('records actor userId, name snapshot, and role snapshot accurately in audit logs and keeps them immutable', async () => {
    await userService.updateUser(
      {
        userId: cashier.id,
        firstName: 'Carlos Modificado',
        lastName: 'Cajero',
      },
      owner
    );

    const auditQueryRepo = repositoryFactory.getAuditQueryRepository();
    const result = await auditQueryRepo.query('biz-1', {});
    expect(result.items.length).toBeGreaterThan(0);

    const updateEvent = result.items.find((e) => e.eventType === 'user.updated');
    expect(updateEvent).toBeDefined();
    expect(updateEvent?.actorUserId).toBe(owner.id);
    expect(updateEvent?.actorNameSnapshot).toBe('Dueño');
    expect(updateEvent?.actorRoleSnapshot).toBe('OWNER');

    await userRepo.updateUser({
      ...owner,
      firstName: 'Nuevo Nombre Dueño',
    });

    const resultAfter = await auditQueryRepo.query('biz-1', {});
    const historicalEvent = resultAfter.items.find((e) => e.eventType === 'user.updated');
    expect(historicalEvent?.actorNameSnapshot).toBe('Dueño');
  });
});
