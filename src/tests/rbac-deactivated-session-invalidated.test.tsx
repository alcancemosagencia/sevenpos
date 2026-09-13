import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { PermissionService } from '../domain/auth/Permissions';
import { User } from '../domain/user/User';

describe('RBAC - Deactivated Session Invalidation', () => {
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
        firstName: 'Cajero Activo',
        role: 'CASHIER',
        pin: '5678',
      },
      owner
    );
    cashier = resC.user!;
  });

  it('immediately invalidates authorization when an active user is deactivated by OWNER', async () => {
    expect(cashier.active).toBe(true);
    expect(PermissionService.can(cashier.role, 'pos.sell')).toBe(true);

    const deactRes = await userService.deactivateUser(cashier.id, owner);
    expect(deactRes.success).toBe(true);

    const freshUser = await userRepo.getUserById(cashier.id);
    expect(freshUser).toBeDefined();
    expect(freshUser?.active).toBe(false);

    const effectiveRole = freshUser?.active ? freshUser.role : 'INVALID';
    expect(PermissionService.can(effectiveRole, 'pos.sell')).toBe(false);
    expect(PermissionService.can(effectiveRole, 'sales.view')).toBe(false);
    expect(PermissionService.getPermissionsForRole(effectiveRole)).toHaveLength(0);
  });
});
